package org.adventwave.events.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * INTERIM. Delivers unpublished outbox rows to the handlers in this process and marks them
 * published, in row order. Workstream C replaces it with Debezium reading the same table from
 * the WAL and Kafka carrying the rows to consumers — at which point this is switched off with
 * {@code adventwave.events.dispatcher.enabled=false} and the handlers become Kafka listeners
 * with no change to their code. The outbox DDL anticipates exactly this: "published_at exists
 * for the interim poller and for observability, and is set by whatever ends up publishing."
 *
 * <p>Semantics, chosen to match what Kafka will give the handlers so nothing is learnt twice:
 * <ul>
 *   <li><b>Delivery, not processing, marks a row published.</b> A handler that throws is logged
 *       at ERROR with the event id and the row still advances, the same way a Kafka offset
 *       advances past a message the consumer could not use. Handlers own their retries.</li>
 *   <li><b>Order within a key is preserved:</b> rows are taken in {@code id} order, one batch at
 *       a time, and a batch is a single transaction.</li>
 *   <li><b>Each handler runs in its own transaction</b> ({@code REQUIRES_NEW}), separate from the
 *       batch's. A handler that fails rolls back only its own writes — including its
 *       {@code processed_events} claim, so the event is genuinely unprocessed — and cannot poison
 *       the batch into rollback-only, which would redeliver the same rows forever.</li>
 *   <li><b>At-least-once across restarts:</b> a crash after a handler's transaction commits but
 *       before {@code published_at} lands redelivers the row; the handler's claim then rejects
 *       it. That is the same guarantee Kafka offsets give, and why handlers are idempotent.</li>
 *   <li>{@code FOR UPDATE SKIP LOCKED} lets a second instance run without double delivery.</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "adventwave.events.dispatcher.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);

    private static final String CLAIM = """
        SELECT id, event_id, aggregate_type, aggregate_id, event_type, payload::text AS payload, created_at
        FROM outbox
        WHERE published_at IS NULL
        ORDER BY id
        LIMIT ?
        FOR UPDATE SKIP LOCKED
        """;
    private static final String PUBLISH = "UPDATE outbox SET published_at = now() WHERE id = ANY(?)";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final TransactionTemplate handlerTransaction;
    private final ObjectMapper objectMapper;
    private final Map<String, List<EventHandler>> handlersByTopic;
    private final int batchSize;

    public OutboxDispatcher(
        JdbcTemplate jdbc,
        TransactionTemplate transaction,
        ObjectMapper objectMapper,
        List<EventHandler> handlers,
        OutboxDispatcherProperties properties
    ) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.handlerTransaction = new TransactionTemplate(transaction.getTransactionManager());
        this.handlerTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.objectMapper = objectMapper;
        this.handlersByTopic = handlers.stream().collect(Collectors.groupingBy(EventHandler::topic));
        this.batchSize = properties.getBatchSize();
        this.handlersByTopic.forEach((topic, list) ->
            log.info("outbox dispatcher: {} handler(s) for {}: {}", list.size(), topic,
                list.stream().map(h -> h.getClass().getSimpleName()).toList()));
    }

    @Scheduled(fixedDelayString = "${adventwave.events.dispatcher.interval-ms:2000}")
    public void dispatchPending() {
        int delivered;
        do {
            delivered = this.transaction.execute(status -> this.dispatchBatch());
        } while (delivered == this.batchSize); // drain a backlog without waiting for the next tick
    }

    /** Claims one batch, delivers it, marks it. Returns how many rows were taken. */
    int dispatchBatch() {
        List<EventEnvelope> batch;
        List<Long> ids;
        try {
            var rows = this.jdbc.queryForList(CLAIM, this.batchSize);
            ids = rows.stream().map(r -> ((Number) r.get("id")).longValue()).toList();
            batch = rows.stream().map(this::toEnvelope).toList();
        } catch (Exception e) {
            log.warn("outbox dispatcher: could not claim a batch; will retry next tick", e);
            return 0;
        }
        if (batch.isEmpty()) return 0;

        for (EventEnvelope envelope : batch) {
            for (EventHandler handler : this.handlersByTopic.getOrDefault(envelope.topic(), List.of())) {
                try {
                    this.handlerTransaction.executeWithoutResult(status -> handler.handle(envelope));
                } catch (Exception e) {
                    // The row still advances (see class comment). This is the line an operator
                    // greps for; event_id is what they replay by.
                    log.error("outbox dispatcher: {} failed on {} event_id={}", handler.getClass().getSimpleName(), envelope.topic(), envelope.eventId(), e);
                }
            }
        }

        // A JDBC array parameter, not varargs: passing Long[] directly would spread it into N
        // placeholders and fail with "column index out of range".
        this.jdbc.update(PUBLISH, ps -> ps.setArray(1, ps.getConnection().createArrayOf("bigint", ids.toArray())));
        log.debug("outbox dispatcher: delivered {} row(s) up to id {}", ids.size(), ids.get(ids.size() - 1));
        return ids.size();
    }

    private EventEnvelope toEnvelope(Map<String, Object> row) {
        JsonNode payload;
        try {
            payload = this.objectMapper.readTree((String) row.get("payload"));
        } catch (Exception e) {
            throw new IllegalStateException("outbox row " + row.get("id") + " holds unparseable JSON", e);
        }
        return new EventEnvelope(
            (UUID) row.get("event_id"),
            (String) row.get("event_type"),
            (String) row.get("aggregate_id"),
            (String) row.get("aggregate_type"),
            payload,
            ((Timestamp) row.get("created_at")).toInstant()
        );
    }
}
