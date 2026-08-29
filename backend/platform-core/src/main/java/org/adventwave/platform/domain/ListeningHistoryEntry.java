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

@Entity
@Table(
    name = "listening_history"
)
public class ListeningHistoryEntry {
    @Id
    @GeneratedValue(
        strategy = GenerationType.IDENTITY
    )
    private Long id;
    @Column(
        name = "user_id",
        nullable = false
    )
    private UUID userId;
    @Column(
        name = "media_item_id",
        nullable = false
    )
    private UUID mediaItemId;
    @Column(
        name = "played_at",
        nullable = false
    )
    private Instant playedAt = Instant.now();
    @Column(
        name = "ms_played",
        nullable = false
    )
    private int msPlayed;
    @Column(
        nullable = false
    )
    private boolean completed;
    @Column(
        name = "session_id"
    )
    private UUID sessionId;
    @Column
    private String device;

    public ListeningHistoryEntry(UUID userId, UUID mediaItemId) {
        this.userId = userId;
        this.mediaItemId = mediaItemId;
    }

    @Generated
    public Long getId() {
        return this.id;
    }

    @Generated
    public UUID getUserId() {
        return this.userId;
    }

    @Generated
    public UUID getMediaItemId() {
        return this.mediaItemId;
    }

    @Generated
    public Instant getPlayedAt() {
        return this.playedAt;
    }

    @Generated
    public int getMsPlayed() {
        return this.msPlayed;
    }

    @Generated
    public boolean isCompleted() {
        return this.completed;
    }

    @Generated
    public UUID getSessionId() {
        return this.sessionId;
    }

    @Generated
    public String getDevice() {
        return this.device;
    }

    @Generated
    public void setId(final Long id) {
        this.id = id;
    }

    @Generated
    public void setUserId(final UUID userId) {
        this.userId = userId;
    }

    @Generated
    public void setMediaItemId(final UUID mediaItemId) {
        this.mediaItemId = mediaItemId;
    }

    @Generated
    public void setPlayedAt(final Instant playedAt) {
        this.playedAt = playedAt;
    }

    @Generated
    public void setMsPlayed(final int msPlayed) {
        this.msPlayed = msPlayed;
    }

    @Generated
    public void setCompleted(final boolean completed) {
        this.completed = completed;
    }

    @Generated
    public void setSessionId(final UUID sessionId) {
        this.sessionId = sessionId;
    }

    @Generated
    public void setDevice(final String device) {
        this.device = device;
    }

    @Generated
    public ListeningHistoryEntry() {
    }
}
