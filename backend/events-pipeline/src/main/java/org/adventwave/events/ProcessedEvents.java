package org.adventwave.events;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The idempotency guard every handler goes through. {@link #claim} returns true exactly once
 * per (event, handler); a redelivered event returns false and the handler returns without
 * acting. Under the interim dispatcher the claim shares the delivery transaction, so a rolled
 * back handler releases its claim; under Kafka the handler commits the claim with its writes.
 */
@Component
public class ProcessedEvents {
    private static final String CLAIM =
        "INSERT INTO processed_events (event_id, handler) VALUES (?, ?) ON CONFLICT DO NOTHING";

    private final JdbcTemplate jdbc;

    public ProcessedEvents(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** @return true if this is the first time {@code handler} sees {@code eventId} */
    public boolean claim(UUID eventId, String handler) {
        return this.jdbc.update(CLAIM, eventId, handler) == 1;
    }
}
