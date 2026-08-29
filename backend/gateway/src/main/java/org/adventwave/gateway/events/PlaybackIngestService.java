package org.adventwave.gateway.events;

import java.time.Instant;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.events.PlayCountingPolicy;
import org.adventwave.contracts.events.PlaybackEvent;
import org.adventwave.platform.library.ListeningHistoryService;
import org.adventwave.platform.outbox.OutboxWriter;
import org.adventwave.platform.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaybackIngestService {
    private final CatalogService catalog;
    private final UserService users;
    private final ListeningHistoryService history;
    private final OutboxWriter outbox;

    public PlaybackIngestService(CatalogService catalog, UserService users, ListeningHistoryService history, OutboxWriter outbox) {
        this.catalog = catalog;
        this.users = users;
        this.history = history;
        this.outbox = outbox;
    }

    @Transactional
    public PlaybackEvent ingest(UUID userId, PlaybackIngestService.Submission submission) {
        MediaItem mediaitem = (MediaItem)this.catalog
            .entity(submission.mediaItemId())
            .orElseThrow(() -> new IllegalArgumentException("unknown or unpublished media item " + submission.mediaItemId()));
        if (!PlaybackEvent.isKnownEventType(submission.eventType())) {
            throw new IllegalArgumentException("unknown event_type " + submission.eventType());
        } else {
            int i = Math.max(0, submission.msPlayed());
            int j = mediaitem.getDurationMs();
            boolean flag = PlayCountingPolicy.counts(i, j);
            boolean flag1 = PlayCountingPolicy.isCompleted(i, j);
            boolean flag2 = this.users.isPrivateSession(userId);
            PlaybackEvent playbackevent = new PlaybackEvent(
                submission.eventId() == null ? UUID.randomUUID().toString() : submission.eventId(),
                userId.toString(),
                mediaitem.getId().toString(),
                mediaitem.getMediaType(),
                submission.sessionId() == null ? null : submission.sessionId().toString(),
                submission.eventType(),
                i,
                j,
                flag,
                flag2,
                submission.device(),
                submission.clientTs(),
                Instant.now().toString()
            );
            this.outbox.append("playback", userId, "playback.events.v1", playbackevent);
            if (!flag2 && flag) {
                this.history.record(userId, mediaitem.getId(), i, flag1, submission.sessionId(), submission.device());
            }

            return playbackevent;
        }
    }

    public record Submission(String eventId, UUID mediaItemId, UUID sessionId, String eventType, int msPlayed, String device, String clientTs) {
    }
}
