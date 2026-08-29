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
import lombok.Generated;

@Entity
@Table(
    name = "playlist_items"
)
public class PlaylistItem {
    @EmbeddedId
    private PlaylistItem.Key id;
    @Column(
        nullable = false
    )
    private int position;
    @Column(
        name = "added_at",
        nullable = false
    )
    private Instant addedAt = Instant.now();
    @Column(
        name = "added_by"
    )
    private UUID addedBy;

    public PlaylistItem(UUID playlistId, UUID mediaItemId, int position, UUID addedBy) {
        this.id = new PlaylistItem.Key(playlistId, mediaItemId);
        this.position = position;
        this.addedBy = addedBy;
    }

    public UUID getPlaylistId() {
        return this.id.getPlaylistId();
    }

    public UUID getMediaItemId() {
        return this.id.getMediaItemId();
    }

    @Generated
    public PlaylistItem.Key getId() {
        return this.id;
    }

    @Generated
    public int getPosition() {
        return this.position;
    }

    @Generated
    public Instant getAddedAt() {
        return this.addedAt;
    }

    @Generated
    public UUID getAddedBy() {
        return this.addedBy;
    }

    @Generated
    public void setId(final PlaylistItem.Key id) {
        this.id = id;
    }

    @Generated
    public void setPosition(final int position) {
        this.position = position;
    }

    @Generated
    public void setAddedAt(final Instant addedAt) {
        this.addedAt = addedAt;
    }

    @Generated
    public void setAddedBy(final UUID addedBy) {
        this.addedBy = addedBy;
    }

    @Generated
    public PlaylistItem() {
    }

    @Embeddable
    public static class Key implements Serializable {
        @Column(
            name = "playlist_id",
            nullable = false
        )
        private UUID playlistId;
        @Column(
            name = "media_item_id",
            nullable = false
        )
        private UUID mediaItemId;

        public Key(UUID playlistId, UUID mediaItemId) {
            this.playlistId = playlistId;
            this.mediaItemId = mediaItemId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            } else {
                return other instanceof PlaylistItem.Key key
                    ? Objects.equals(this.playlistId, key.playlistId) && Objects.equals(this.mediaItemId, key.mediaItemId)
                    : false;
            }
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.playlistId, this.mediaItemId);
        }

        @Generated
        public UUID getPlaylistId() {
            return this.playlistId;
        }

        @Generated
        public UUID getMediaItemId() {
            return this.mediaItemId;
        }

        @Generated
        public void setPlaylistId(final UUID playlistId) {
            this.playlistId = playlistId;
        }

        @Generated
        public void setMediaItemId(final UUID mediaItemId) {
            this.mediaItemId = mediaItemId;
        }

        @Generated
        public Key() {
        }
    }
}
