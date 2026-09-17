package org.adventwave.events;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

/**
 * One message as a consumer sees it, whichever transport delivered it. The fields are the
 * outbox envelope from contracts/kafka/README.md: with Debezium's outbox router they become
 * the Kafka key, headers and value; with the interim dispatcher they are read straight from
 * the row. Handlers are written against this so they do not change when the transport does.
 *
 * @param eventId       idempotency key — consumers dedupe on it
 * @param topic         e.g. {@code playback.events.v1}
 * @param key           the Kafka key: {@code user_id}, {@code playlist_id}, ...
 * @param aggregateType {@code playback}, {@code library}, {@code playlist}
 * @param payload       the message value, validated by {@code contracts/kafka/<topic>/schema.json}
 * @param createdAt     the producer's clock
 */
public record EventEnvelope(UUID eventId, String topic, String key, String aggregateType, JsonNode payload, Instant createdAt) {
}
