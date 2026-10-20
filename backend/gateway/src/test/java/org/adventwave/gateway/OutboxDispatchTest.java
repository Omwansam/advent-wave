package org.adventwave.gateway;

import java.time.Instant;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories.MediaItemRepository;
import org.adventwave.contracts.api.UserSettingsDto;
import org.adventwave.contracts.events.PlaybackEvent;
import org.adventwave.events.counts.TrendingService;
import org.adventwave.events.outbox.OutboxDispatcher;
import org.adventwave.gateway.events.PlaybackIngestService;
import org.adventwave.gateway.events.PlaybackIngestService.Submission;
import org.adventwave.platform.user.UserService;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Workstream C's contract terms, proven against the interim transport. The same assertions
 * must hold when Debezium and Kafka carry the rows — the handlers do not change.
 */
class OutboxDispatchTest extends IntegrationTest {
    @Autowired
    PlaybackIngestService ingest;
    @Autowired
    OutboxDispatcher dispatcher;
    @Autowired
    TrendingService trending;
    @Autowired
    UserService users;
    @Autowired
    MediaItemRepository mediaItems;
    @Autowired
    JdbcTemplate jdbc;
    private UUID userId;
    private UUID mediaItemId;

    @BeforeEach
    void setUp() {
        this.userId = this.users.provision("test|dispatch-" + UUID.randomUUID(), UUID.randomUUID() + "@example.test", "Dispatch Tester", null).getId();
        // s9 is a low-popularity item, so a count on it is unambiguously from this test.
        this.mediaItemId = ((MediaItem) this.mediaItems.findByLegacyId("s9").orElseThrow()).getId();
        this.jdbc.update("DELETE FROM play_counts_by_item_day WHERE media_item_id = ?", this.mediaItemId);
        this.dispatcher.dispatchPending(); // start from a drained outbox
    }

    private PlaybackEvent play(String eventType, int msPlayed) {
        return this.ingest.ingest(
            this.userId,
            new Submission(UUID.randomUUID(), this.mediaItemId, UUID.randomUUID(), eventType, msPlayed, "web", Instant.now().toString())
        );
    }

    private int plays() {
        Integer n = this.jdbc.queryForObject("SELECT COALESCE(SUM(plays), 0) FROM play_counts_by_item_day WHERE media_item_id = ?", Integer.class, this.mediaItemId);
        return n == null ? 0 : n;
    }

    private long unpublished() {
        Long n = this.jdbc.queryForObject("SELECT COUNT(*) FROM outbox WHERE published_at IS NULL", Long.class);
        return n == null ? 0 : n;
    }

    @Test
    @DisplayName("a counted, terminal play becomes one play count, and the row is marked published")
    void countedTerminalPlayIsCounted() {
        this.play("play_completed", 200000);
        Assertions.assertThat(this.unpublished()).isGreaterThan(0);
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isEqualTo(1);
        Assertions.assertThat(this.unpublished()).isZero();
    }

    @Test
    @DisplayName("a private play is delivered, flagged, and never counted (the privacy rule, at the consumer)")
    void privatePlayIsNotCounted() {
        this.users.updateSettings(this.userId, new UserSettingsDto("light", true, false, false, 6, false, false, "normal", null));
        PlaybackEvent playbackevent = this.play("play_completed", 200000);
        Assertions.assertThat(playbackevent.privateSession()).isTrue();
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isZero();
        Assertions.assertThat(this.unpublished()).isZero();
    }

    @Test
    @DisplayName("below the threshold is not a play, whatever the event type says")
    void uncountedPlayIsNotCounted() {
        this.play("play_completed", 5000);
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isZero();
    }

    @Test
    @DisplayName("one listen, one count: progress events past the threshold do not add up")
    void progressEventsDoNotDoubleCount() {
        this.play("play_progress", 60000);
        this.play("play_progress", 120000);
        this.play("play_completed", 240000);
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isEqualTo(1);
    }

    @Test
    @DisplayName("redelivery is harmless: the same event twice counts once (idempotent on event_id)")
    void redeliveryDoesNotDoubleCount() {
        PlaybackEvent playbackevent = this.play("skipped", 90000);
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isEqualTo(1);

        this.jdbc.update("UPDATE outbox SET published_at = NULL WHERE event_id = ?", UUID.fromString(playbackevent.eventId()));
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.plays()).isEqualTo(1);
        Assertions.assertThat(this.unpublished()).isZero();
    }

    @Test
    @DisplayName("trending reads what was counted")
    void trendingReflectsCounts() {
        this.play("play_completed", 200000);
        this.play("play_completed", 200000);
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.trending.topItemIds(7, 1)).containsExactly(this.mediaItemId);
    }
}
