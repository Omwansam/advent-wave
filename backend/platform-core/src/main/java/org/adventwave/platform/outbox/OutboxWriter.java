package org.adventwave.platform.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.adventwave.platform.domain.OutboxEvent;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxWriter {
    private final PlatformRepositories.OutboxRepository outbox;
    private final ObjectMapper objectMapper;

    public OutboxWriter(PlatformRepositories.OutboxRepository outbox, ObjectMapper objectMapper) {
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional(
        propagation = Propagation.MANDATORY
    )
    public UUID append(String aggregateType, Object aggregateId, String eventType, Object payload) {
        String s;
        try {
            s = this.objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException jsonprocessingexception) {
            throw new IllegalArgumentException("outbox payload for " + eventType + " is not serialisable", jsonprocessingexception);
        }

        OutboxEvent outboxevent = new OutboxEvent(aggregateType, String.valueOf(aggregateId), eventType, s);
        this.outbox.save(outboxevent);
        return outboxevent.getEventId();
    }
}
