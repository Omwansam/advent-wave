package org.adventwave.gateway.events;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.adventwave.contracts.events.Topics;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.adventwave.events.ProcessedEvents;
import org.adventwave.gateway.audio.LocalTranscodeWorker;
import org.adventwave.gateway.audio.TranscodeJob;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Workstream D's input on the transcode seam, locally (RFC 0001): consumes
 * {@code audio.transcode.v1} {@code requested} and hands the job to {@link LocalTranscodeWorker}.
 *
 * <p>It returns at once. The dispatcher runs handlers synchronously and never retries one that
 * throws, and a transcode takes minutes — so the work happens on the worker's thread, and the
 * worker owns the retries. The job is handed over only after the claim commits: a claim rolled
 * back would otherwise leave a job running for an event that counts as unprocessed.
 *
 * <p>{@code completed} messages on the same topic are {@code TranscodeCompletedHandler}'s.
 */
@Component
@ConditionalOnProperty(name = "adventwave.audio.local-worker-enabled", havingValue = "true")
public class TranscodeRequestedHandler implements EventHandler {
    static final String HANDLER = "transcode-requested";

    private final LocalTranscodeWorker worker;
    private final ProcessedEvents processed;

    public TranscodeRequestedHandler(LocalTranscodeWorker worker, ProcessedEvents processed) {
        this.worker = worker;
        this.processed = processed;
    }

    @Override
    public String topic() {
        return Topics.AUDIO_TRANSCODE;
    }

    @Override
    public void handle(EventEnvelope envelope) {
        JsonNode p = envelope.payload();
        if (!"requested".equals(p.path("kind").asText())) return;
        if (!this.processed.claim(envelope.eventId(), HANDLER)) return;

        TranscodeJob job = new TranscodeJob(
            UUID.fromString(p.path("media_item_id").asText()),
            p.path("media_type").asText(),
            p.path("master_storage_key").asText(),
            p.path("attempt").asInt(1));

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    TranscodeRequestedHandler.this.worker.enqueue(job);
                }
            });
        } else {
            this.worker.enqueue(job);
        }
    }
}
