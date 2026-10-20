package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** One listener's resume point in one sermon or podcast episode (RFC 0003). */
@Entity
@Table(
    name = "listening_progress"
)
public class ListeningProgress {
    @EmbeddedId
    private ListeningProgress.Key id;
    @Column(
        name = "position_ms",
        nullable = false
    )
    private int positionMs;
    @Column(
        name = "completed",
        nullable = false
    )
    private boolean completed;
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();

    public ListeningProgress(UUID userId, UUID mediaItemId) {
        this.id = new ListeningProgress.Key(userId, mediaItemId);
    }

    protected ListeningProgress() {
    }

    public UUID getMediaItemId() {
        return this.id.getMediaItemId();
    }

    public ListeningProgress.Key getId() {
        return this.id;
    }

    public int getPositionMs() {
        return this.positionMs;
    }

    public void setPositionMs(int positionMs) {
        this.positionMs = positionMs;
    }

    public boolean isCompleted() {
        return this.completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Embeddable
    public static class Key implements Serializable {
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

        public Key(UUID userId, UUID mediaItemId) {
            this.userId = userId;
            this.mediaItemId = mediaItemId;
        }

        protected Key() {
        }

        public UUID getUserId() {
            return this.userId;
        }

        public UUID getMediaItemId() {
            return this.mediaItemId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            return other instanceof ListeningProgress.Key key
                && Objects.equals(this.userId, key.userId)
                && Objects.equals(this.mediaItemId, key.mediaItemId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.userId, this.mediaItemId);
        }
    }
}
