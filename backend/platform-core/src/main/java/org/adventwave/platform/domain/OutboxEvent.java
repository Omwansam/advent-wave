package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;
import org.hibernate.annotations.JdbcTypeCode;

@Entity
@Table(
    name = "outbox"
)
public class OutboxEvent {
    @Id
    @GeneratedValue(
        strategy = GenerationType.IDENTITY
    )
    private Long id;
    @Column(
        name = "event_id",
        nullable = false,
        unique = true,
        updatable = false
    )
    private UUID eventId = UUID.randomUUID();
    @Column(
        name = "aggregate_type",
        nullable = false,
        updatable = false
    )
    private String aggregateType;
    @Column(
        name = "aggregate_id",
        nullable = false,
        updatable = false
    )
    private String aggregateId;
    @Column(
        name = "event_type",
        nullable = false,
        updatable = false
    )
    private String eventType;
    @JdbcTypeCode(3001)
    @Column(
        nullable = false,
        updatable = false
    )
    private String payload;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();
    @Column(
        name = "published_at"
    )
    private Instant publishedAt;

    public OutboxEvent(String aggregateType, String aggregateId, String eventType, String payload) {
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
    }

    @Generated
    public Long getId() {
        return this.id;
    }

    @Generated
    public UUID getEventId() {
        return this.eventId;
    }

    @Generated
    public String getAggregateType() {
        return this.aggregateType;
    }

    @Generated
    public String getAggregateId() {
        return this.aggregateId;
    }

    @Generated
    public String getEventType() {
        return this.eventType;
    }

    @Generated
    public String getPayload() {
        return this.payload;
    }

    @Generated
    public Instant getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public Instant getPublishedAt() {
        return this.publishedAt;
    }

    @Generated
    public void setId(final Long id) {
        this.id = id;
    }

    @Generated
    public void setEventId(final UUID eventId) {
        this.eventId = eventId;
    }

    @Generated
    public void setAggregateType(final String aggregateType) {
        this.aggregateType = aggregateType;
    }

    @Generated
    public void setAggregateId(final String aggregateId) {
        this.aggregateId = aggregateId;
    }

    @Generated
    public void setEventType(final String eventType) {
        this.eventType = eventType;
    }

    @Generated
    public void setPayload(final String payload) {
        this.payload = payload;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setPublishedAt(final Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    @Generated
    public OutboxEvent() {
    }
}
