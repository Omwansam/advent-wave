package org.adventwave.platform.domain;

import jakarta.persistence.AttributeOverride;
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

public final class UserFollow {
    private UserFollow() {
    }

    @Entity
    @Table(
        name = "user_follows_artist"
    )
    public static class Artist {
        @EmbeddedId
        @AttributeOverride(
            name = "targetId",
            column = @Column(
                name = "artist_id",
                nullable = false
            )
        )
        private UserFollow.Key id;
        @Column(
            name = "created_at",
            nullable = false
        )
        private Instant createdAt = Instant.now();

        public Artist(UUID userId, UUID artistId) {
            this.id = new UserFollow.Key(userId, artistId);
        }

        public UUID getArtistId() {
            return this.id.getTargetId();
        }

        @Generated
        public UserFollow.Key getId() {
            return this.id;
        }

        @Generated
        public Instant getCreatedAt() {
            return this.createdAt;
        }

        @Generated
        public void setId(final UserFollow.Key id) {
            this.id = id;
        }

        @Generated
        public void setCreatedAt(final Instant createdAt) {
            this.createdAt = createdAt;
        }

        @Generated
        public Artist() {
        }
    }

    @Embeddable
    public static class Key implements Serializable {
        @Column(
            name = "user_id",
            nullable = false
        )
        private UUID userId;
        @Column(
            name = "target_id",
            nullable = false
        )
        private UUID targetId;

        public Key(UUID userId, UUID targetId) {
            this.userId = userId;
            this.targetId = targetId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            } else {
                return other instanceof UserFollow.Key key ? Objects.equals(this.userId, key.userId) && Objects.equals(this.targetId, key.targetId) : false;
            }
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.userId, this.targetId);
        }

        @Generated
        public UUID getUserId() {
            return this.userId;
        }

        @Generated
        public UUID getTargetId() {
            return this.targetId;
        }

        @Generated
        public void setUserId(final UUID userId) {
            this.userId = userId;
        }

        @Generated
        public void setTargetId(final UUID targetId) {
            this.targetId = targetId;
        }

        @Generated
        public Key() {
        }
    }

    @Entity
    @Table(
        name = "user_follows_playlist"
    )
    public static class PlaylistFollow {
        @EmbeddedId
        @AttributeOverride(
            name = "targetId",
            column = @Column(
                name = "playlist_id",
                nullable = false
            )
        )
        private UserFollow.Key id;
        @Column(
            name = "created_at",
            nullable = false
        )
        private Instant createdAt = Instant.now();

        public PlaylistFollow(UUID userId, UUID playlistId) {
            this.id = new UserFollow.Key(userId, playlistId);
        }

        public UUID getPlaylistId() {
            return this.id.getTargetId();
        }

        @Generated
        public UserFollow.Key getId() {
            return this.id;
        }

        @Generated
        public Instant getCreatedAt() {
            return this.createdAt;
        }

        @Generated
        public void setId(final UserFollow.Key id) {
            this.id = id;
        }

        @Generated
        public void setCreatedAt(final Instant createdAt) {
            this.createdAt = createdAt;
        }

        @Generated
        public PlaylistFollow() {
        }
    }
}
