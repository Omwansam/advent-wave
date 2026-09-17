package org.adventwave.gateway.events;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.adventwave.contracts.events.Topics;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.adventwave.events.ProcessedEvents;
import org.adventwave.gateway.admin.MediaPublicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Workstream A's side of the transcode seam (plan §11.6): consumes {@code audio.transcode.v1}
 * {@code completed} messages, stores the outputs, and moves the item
 * {@code processing → published} — which the database refuses without a granted licence. That
 * refusal is expected, not an error: the outputs are kept, the item stays {@code processing},
 * and an operator publishes it after the licence is granted.
 *
 * <p>Deliberately not {@code @Transactional}: the two writes are separate committed
 * transactions in {@link MediaPublicationService} (see its class comment for why). This
 * method runs inside the dispatcher's per-handler transaction, which holds only the
 * {@code processed_events} claim — committed if we return, released if we throw.
 *
 * <p>{@code requested} messages on the same topic are the worker's input and are ignored here.
 * Nothing produces {@code completed} yet — the worker is workstream D.
 */
@Component
public class TranscodeCompletedHandler implements EventHandler {
    static final String HANDLER = "transcode-completed";
    private static final Logger log = LoggerFactory.getLogger(TranscodeCompletedHandler.class);

    private final MediaPublicationService publication;
    private final ProcessedEvents processed;

    public TranscodeCompletedHandler(MediaPublicationService publication, ProcessedEvents processed) {
        this.publication = publication;
        this.processed = processed;
    }

    @Override
    public String topic() {
        return Topics.AUDIO_TRANSCODE;
    }

    @Override
    public void handle(EventEnvelope envelope) {
        JsonNode p = envelope.payload();
        if (!"completed".equals(p.path("kind").asText())) return;
        if (!this.processed.claim(envelope.eventId(), HANDLER)) return;

        UUID mediaItemId = UUID.fromString(p.path("media_item_id").asText());

        if ("failed".equals(p.path("status").asText())) {
            this.publication.markFailed(mediaItemId,
                p.path("error").path("message").asText() + " (stage " + p.path("error").path("stage").asText() + ")");
            return;
        }

        this.publication.storeTranscodeOutputs(mediaItemId, p);   // commits
        try {
            this.publication.publish(mediaItemId);                 // its own transaction
        } catch (DataIntegrityViolationException refused) {
            log.warn("transcode complete for {} but publication refused — outputs stored, item stays 'processing' until its licence is granted", mediaItemId);
        }
    }
}
