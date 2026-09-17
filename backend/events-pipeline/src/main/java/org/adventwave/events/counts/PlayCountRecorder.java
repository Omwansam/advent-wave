package org.adventwave.events.counts;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.events.PlaybackEvent;
import org.adventwave.contracts.events.Topics;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.adventwave.events.ProcessedEvents;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumes {@code playback.events.v1} into the play-count tables — the numbers reported to
 * contributing churches, and the source of "Trending now".
 *
 * <p>Three rules, in order:
 * <ol>
 *   <li><b>Privacy.</b> {@code private: true} is never counted. Verbatim from the plan; it is a
 *       contract term, re-enforced here even though the gateway already applied it upstream.</li>
 *   <li><b>Only counted events count.</b> {@code counted} is the server's verdict on the
 *       30-second / 50% rule; this handler does not re-derive it.</li>
 *   <li><b>One listen, one count.</b> A listen produces one terminal event —
 *       {@code play_completed} or {@code skipped} — carrying the full {@code ms_played}.
 *       {@code play_progress} events along the way can also clear the threshold, so counting
 *       them would count a single listen several times. Terminal events only.</li>
 * </ol>
 * The day is the event's {@code server_ts} in UTC, matching the CQL {@code day date} column.
 */
@Component
public class PlayCountRecorder implements EventHandler {
    static final String HANDLER = "play-counts";
    private static final Logger log = LoggerFactory.getLogger(PlayCountRecorder.class);
    private static final List<String> TERMINAL = List.of(PlaybackEvent.PLAY_COMPLETED, PlaybackEvent.SKIPPED);

    private static final String UPSERT_ITEM = """
        INSERT INTO play_counts_by_item_day (media_item_id, day, plays) VALUES (?, ?, 1)
        ON CONFLICT (media_item_id, day) DO UPDATE SET plays = play_counts_by_item_day.plays + 1
        """;
    private static final String UPSERT_ARTIST = """
        INSERT INTO play_counts_by_artist_day (artist_id, day, plays)
        SELECT artist_id, ?, 1 FROM media_items WHERE id = ?
        ON CONFLICT (artist_id, day) DO UPDATE SET plays = play_counts_by_artist_day.plays + 1
        """;

    private final JdbcTemplate jdbc;
    private final ProcessedEvents processed;

    public PlayCountRecorder(JdbcTemplate jdbc, ProcessedEvents processed) {
        this.jdbc = jdbc;
        this.processed = processed;
    }

    @Override
    public String topic() {
        return Topics.PLAYBACK_EVENTS;
    }

    @Override
    @Transactional
    public void handle(EventEnvelope envelope) {
        JsonNode p = envelope.payload();
        if (p.path("private").asBoolean(false)) return;
        if (!p.path("counted").asBoolean(false)) return;
        if (!TERMINAL.contains(p.path("event_type").asText())) return;
        if (!this.processed.claim(envelope.eventId(), HANDLER)) {
            log.debug("play-counts: event {} already processed, skipping", envelope.eventId());
            return;
        }

        UUID mediaItemId = UUID.fromString(p.path("media_item_id").asText());
        LocalDate day = Instant.parse(p.path("server_ts").asText()).atOffset(ZoneOffset.UTC).toLocalDate();
        this.jdbc.update(UPSERT_ITEM, mediaItemId, day);
        this.jdbc.update(UPSERT_ARTIST, day, mediaItemId);
    }
}
