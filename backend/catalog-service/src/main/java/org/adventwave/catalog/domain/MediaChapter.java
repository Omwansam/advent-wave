package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** One chapter of a sermon or podcast episode (RFC 0004). Position orders them; so do starts. */
@Entity
@Table(
    name = "media_chapters"
)
public class MediaChapter {
    @EmbeddedId
    private MediaChapter.Key id;
    @Column(
        name = "start_ms",
        nullable = false
    )
    private int startMs;
    @Column(
        name = "title",
        nullable = false
    )
    private String title;

    public MediaChapter(UUID mediaItemId, short position, int startMs, String title) {
        this.id = new MediaChapter.Key(mediaItemId, position);
        this.startMs = startMs;
        this.title = title;
    }

    protected MediaChapter() {
    }

    public MediaChapter.Key getId() {
        return this.id;
    }

    public int getStartMs() {
        return this.startMs;
    }

    public String getTitle() {
        return this.title;
    }

    @Embeddable
    public static class Key implements Serializable {
        @Column(
            name = "media_item_id",
            nullable = false
        )
        private UUID mediaItemId;
        @Column(
            name = "position",
            nullable = false
        )
        private short position;

        public Key(UUID mediaItemId, short position) {
            this.mediaItemId = mediaItemId;
            this.position = position;
        }

        protected Key() {
        }

        public UUID getMediaItemId() {
            return this.mediaItemId;
        }

        public short getPosition() {
            return this.position;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            return other instanceof MediaChapter.Key key
                && this.position == key.position
                && Objects.equals(this.mediaItemId, key.mediaItemId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.mediaItemId, this.position);
        }
    }
}
