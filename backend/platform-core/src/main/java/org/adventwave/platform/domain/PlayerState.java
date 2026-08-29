package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Generated;
import org.hibernate.annotations.JdbcTypeCode;

@Entity
@Table(
    name = "player_state"
)
public class PlayerState {
    @Id
    @Column(
        name = "user_id",
        nullable = false,
        updatable = false
    )
    private UUID userId;
    @Column(
        name = "media_item_id"
    )
    private UUID mediaItemId;
    @Column(
        name = "position_ms",
        nullable = false
    )
    private int positionMs;
    @JdbcTypeCode(3001)
    @Column(
        nullable = false
    )
    private List<String> queue = new ArrayList<>();
    @JdbcTypeCode(3001)
    @Column(
        name = "ordered_queue"
    )
    private List<String> orderedQueue;
    @Column(
        name = "current_index",
        nullable = false
    )
    private int currentIndex;
    @Column(
        nullable = false
    )
    private boolean shuffle;
    @Column(
        name = "repeat_mode",
        nullable = false
    )
    private String repeatMode = "off";
    @Column(
        nullable = false
    )
    private double volume = 0.85;
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();

    public PlayerState(UUID userId) {
        this.userId = userId;
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
    public int getPositionMs() {
        return this.positionMs;
    }

    @Generated
    public List<String> getQueue() {
        return this.queue;
    }

    @Generated
    public List<String> getOrderedQueue() {
        return this.orderedQueue;
    }

    @Generated
    public int getCurrentIndex() {
        return this.currentIndex;
    }

    @Generated
    public boolean isShuffle() {
        return this.shuffle;
    }

    @Generated
    public String getRepeatMode() {
        return this.repeatMode;
    }

    @Generated
    public double getVolume() {
        return this.volume;
    }

    @Generated
    public Instant getUpdatedAt() {
        return this.updatedAt;
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
    public void setPositionMs(final int positionMs) {
        this.positionMs = positionMs;
    }

    @Generated
    public void setQueue(final List<String> queue) {
        this.queue = queue;
    }

    @Generated
    public void setOrderedQueue(final List<String> orderedQueue) {
        this.orderedQueue = orderedQueue;
    }

    @Generated
    public void setCurrentIndex(final int currentIndex) {
        this.currentIndex = currentIndex;
    }

    @Generated
    public void setShuffle(final boolean shuffle) {
        this.shuffle = shuffle;
    }

    @Generated
    public void setRepeatMode(final String repeatMode) {
        this.repeatMode = repeatMode;
    }

    @Generated
    public void setVolume(final double volume) {
        this.volume = volume;
    }

    @Generated
    public void setUpdatedAt(final Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public PlayerState() {
    }
}
