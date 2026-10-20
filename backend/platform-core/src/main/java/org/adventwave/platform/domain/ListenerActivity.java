package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * What one listener last played, as the people who follow them see it (RFC 0007). Never written
 * in a private session or with sharing off.
 */
@Entity
@Table(
    name = "listener_activity"
)
public class ListenerActivity {
    @Id
    @Column(
        name = "user_id",
        nullable = false,
        updatable = false
    )
    private UUID userId;
    @Column(
        name = "media_item_id",
        nullable = false
    )
    private UUID mediaItemId;
    @Column(
        name = "playing",
        nullable = false
    )
    private boolean playing;
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();

    public ListenerActivity(UUID userId) {
        this.userId = userId;
    }

    protected ListenerActivity() {
    }

    public UUID getUserId() {
        return this.userId;
    }

    public UUID getMediaItemId() {
        return this.mediaItemId;
    }

    public boolean isPlaying() {
        return this.playing;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public void record(UUID mediaItemId, boolean playing, Instant at) {
        this.mediaItemId = mediaItemId;
        this.playing = playing;
        this.updatedAt = at;
    }
}
