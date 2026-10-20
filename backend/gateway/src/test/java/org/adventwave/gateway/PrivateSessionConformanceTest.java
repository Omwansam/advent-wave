package org.adventwave.gateway;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories.MediaItemRepository;
import org.adventwave.contracts.api.UserSettingsDto;
import org.adventwave.contracts.events.PlaybackEvent;
import org.adventwave.gateway.events.PlaybackIngestService;
import org.adventwave.gateway.events.PlaybackIngestService.Submission;
import org.adventwave.platform.domain.OutboxEvent;
import org.adventwave.platform.library.ListeningHistoryService;
import org.adventwave.platform.library.LibrarySnapshot.HistoryRow;
import org.adventwave.platform.repo.PlatformRepositories.OutboxRepository;
import org.adventwave.platform.social.FriendService;
import org.adventwave.platform.user.UserService;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PrivateSessionConformanceTest extends IntegrationTest {
    @Autowired
    PlaybackIngestService ingest;
    @Autowired
    UserService users;
    @Autowired
    ListeningHistoryService history;
    @Autowired
    OutboxRepository outbox;
    @Autowired
    MediaItemRepository mediaItems;
    @Autowired
    FriendService friends;
    private UUID userId;
    private UUID mediaItemId;

    @BeforeEach
    void setUp() {
        this.userId = this.users.provision("test|private-" + UUID.randomUUID(), UUID.randomUUID() + "@example.test", "Private Tester", null).getId();
        this.mediaItemId = ((MediaItem)this.mediaItems.findByLegacyId("s15").orElseThrow()).getId();
        this.history.clear(this.userId);
    }

    private PlaybackEvent play(int msPlayed) {
        return this.ingest
            .ingest(
                this.userId,
                new Submission(UUID.randomUUID(), this.mediaItemId, UUID.randomUUID(), "play_progress", msPlayed, "web", Instant.now().toString())
            );
    }

    @Test
    @DisplayName("a private play never reaches listening history")
    void privatePlayLeavesNoHistory() {
        this.users.updateSettings(this.userId, this.privateSession(true));
        PlaybackEvent playbackevent = this.play(120000);
        Assertions.assertThat(playbackevent.privateSession()).isTrue();
        Assertions.assertThat(playbackevent.counted()).isTrue();
        Assertions.assertThat(this.history.recent(this.userId, 100)).isEmpty();
    }

    @Test
    @DisplayName("a normal play does reach history — the exclusion is the private flag, not a broken path")
    void normalPlayIsRecorded() {
        this.users.updateSettings(this.userId, this.privateSession(false));
        this.play(120000);
        Assertions.assertThat(this.history.recent(this.userId, 100)).extracting(row -> row.mediaItemId()).containsExactly(new UUID[]{this.mediaItemId});
    }

    @Test
    @DisplayName("one event, one id: the payload's event_id and the outbox row's are the same value (contract K1)")
    void oneEventIdPerEvent() {
        UUID clientEventId = UUID.randomUUID();
        PlaybackEvent playbackevent = this.ingest
            .ingest(
                this.userId,
                new Submission(clientEventId, this.mediaItemId, UUID.randomUUID(), "play_progress", 45000, "web", Instant.now().toString())
            );
        Assertions.assertThat(playbackevent.eventId()).isEqualTo(clientEventId.toString());
        Assertions.assertThat(this.outbox.findAll())
            .filteredOn(row -> row.getPayload().contains(clientEventId.toString()))
            .singleElement()
            .extracting(OutboxEvent::getEventId)
            .isEqualTo(clientEventId);
    }

    @Test
    @DisplayName("the event is still emitted when private, flagged so consumers can honour it")
    void privateEventIsEmittedWithTheFlag() {
        this.users.updateSettings(this.userId, this.privateSession(true));
        this.play(60000);
        List<OutboxEvent> list = this.outbox.findByAggregateTypeAndAggregateIdOrderByIdAsc("playback", this.userId.toString());
        Assertions.assertThat(list).hasSize(1);
        Assertions.assertThat(list.get(0).getEventType()).isEqualTo("playback.events.v1");
        Assertions.assertThat(list.get(0).getPayload()).contains(new CharSequence[]{"\"private\":true"});
    }

    @Test
    @DisplayName("turning private session off does not retroactively record what happened while it was on")
    void privateHistoryIsNotBackfilled() {
        this.users.updateSettings(this.userId, this.privateSession(true));
        this.play(120000);
        this.users.updateSettings(this.userId, this.privateSession(false));
        Assertions.assertThat(this.history.recent(this.userId, 100)).isEmpty();
    }

    @Test
    @DisplayName("the client cannot decide what counts: a 5-second play is not a play")
    void countingIsServerSide() {
        this.users.updateSettings(this.userId, this.privateSession(false));
        PlaybackEvent playbackevent = this.play(5000);
        Assertions.assertThat(playbackevent.counted()).isFalse();
        Assertions.assertThat(this.history.recent(this.userId, 100)).isEmpty();
    }

    @Test
    @DisplayName("duration comes from the catalogue, not from the request")
    void durationIsServerSide() {
        PlaybackEvent playbackevent = this.play(1000);
        Assertions.assertThat(playbackevent.durationMs()).isEqualTo(((MediaItem)this.mediaItems.findById(this.mediaItemId).orElseThrow()).getDurationMs());
    }

    @Test
    @DisplayName("a private play never reaches the friend-activity feed (RFC 0007)")
    void privatePlayLeavesNoFriendActivity() {
        UUID follower = this.follower();
        this.users.updateSettings(this.userId, this.privateSession(true));
        this.play(120000);
        Assertions.assertThat(this.friends.friends(follower)).singleElement().extracting(FriendService.Friend::activity).isNull();
    }

    @Test
    @DisplayName("starting a private session removes what followers could already see, and ending it reveals nothing")
    void privateSessionClearsFriendActivity() {
        UUID follower = this.follower();
        this.users.updateSettings(this.userId, this.privateSession(false));
        this.play(1000);
        Assertions.assertThat(this.friends.friends(follower)).singleElement().extracting(FriendService.Friend::activity).isNotNull();
        this.users.updateSettings(this.userId, this.privateSession(true));
        Assertions.assertThat(this.friends.friends(follower)).singleElement().extracting(FriendService.Friend::activity).isNull();
        this.users.updateSettings(this.userId, this.privateSession(false));
        Assertions.assertThat(this.friends.friends(follower)).singleElement().extracting(FriendService.Friend::activity).isNull();
    }

    private UUID follower() {
        UUID follower = this.users.provision("test|follower-" + UUID.randomUUID(), UUID.randomUUID() + "@example.test", "Follower", null).getId();
        this.friends.toggleFollow(follower, this.userId);
        return follower;
    }

    private UserSettingsDto privateSession(boolean on) {
        return new UserSettingsDto("light", on, false, false, 6, false, false, "normal", null, null);
    }
}
