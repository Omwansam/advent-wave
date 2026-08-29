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
    name = "user_likes"
)
public class UserLike {
    public static final String LIKED_SONGS = "liked_songs";
    public static final String SAVED_SERMONS = "saved_sermons";
    @EmbeddedId
    private UserLike.Key id;
    @Column(
        name = "created_at",
        nullable = false
    )
    private Instant createdAt = Instant.now();

    public UserLike(UUID userId, UUID mediaItemId, String collection) {
        this.id = new UserLike.Key(userId, mediaItemId, collection);
    }

    public UUID getMediaItemId() {
        return this.id.getMediaItemId();
    }

    public String getCollection() {
        return this.id.getCollection();
    }

    @Generated
    public UserLike.Key getId() {
        return this.id;
    }

    @Generated
    public Instant getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public void setId(final UserLike.Key id) {
        this.id = id;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public UserLike() {
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
        @Column(
            name = "collection",
            nullable = false
        )
        private String collection;

        public Key(UUID userId, UUID mediaItemId, String collection) {
            this.userId = userId;
            this.mediaItemId = mediaItemId;
            this.collection = collection;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            } else {
                return other instanceof UserLike.Key key
                    ? Objects.equals(this.userId, key.userId)
                        && Objects.equals(this.mediaItemId, key.mediaItemId)
                        && Objects.equals(this.collection, key.collection)
                    : false;
            }
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.userId, this.mediaItemId, this.collection);
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
        public String getCollection() {
            return this.collection;
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
        public void setCollection(final String collection) {
            this.collection = collection;
        }

        @Generated
        public Key() {
        }
    }
}
