package org.adventwave.catalog.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A song's words, with the basis on which they may be shown (RFC 0004). The lines live in
 * media_lyric_lines, in order; {@link #plainText} is rebuilt from them on every write, for search.
 */
@Entity
@Table(
    name = "media_lyrics"
)
public class MediaLyrics {
    @Id
    @Column(
        name = "media_item_id",
        nullable = false,
        updatable = false
    )
    private UUID mediaItemId;
    @Column(
        name = "language"
    )
    private String language;
    @Column(
        name = "rights_basis",
        nullable = false
    )
    private String rightsBasis;
    @Column(
        name = "credit",
        nullable = false
    )
    private String credit;
    @Column(
        name = "plain_text",
        nullable = false
    )
    private String plainText;
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();
    @ElementCollection(
        fetch = FetchType.EAGER
    )
    @CollectionTable(
        name = "media_lyric_lines",
        joinColumns = @JoinColumn(name = "media_item_id")
    )
    @OrderColumn(
        name = "position"
    )
    private List<MediaLyrics.Line> lines = new ArrayList<>();

    public MediaLyrics(UUID mediaItemId) {
        this.mediaItemId = mediaItemId;
    }

    protected MediaLyrics() {
    }

    /** True when every line has a start time. The writer allows only all or none. */
    public boolean isSynced() {
        return !this.lines.isEmpty() && this.lines.stream().allMatch(l -> l.getStartMs() != null);
    }

    /** Replaces the lines and the search text built from them. */
    public void replaceLines(List<MediaLyrics.Line> lines) {
        this.lines.clear();
        this.lines.addAll(lines);
        this.plainText = String.join("\n", lines.stream().map(MediaLyrics.Line::getText).toList());
    }

    public UUID getMediaItemId() {
        return this.mediaItemId;
    }

    public String getLanguage() {
        return this.language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getRightsBasis() {
        return this.rightsBasis;
    }

    public void setRightsBasis(String rightsBasis) {
        this.rightsBasis = rightsBasis;
    }

    public String getCredit() {
        return this.credit;
    }

    public void setCredit(String credit) {
        this.credit = credit;
    }

    public String getPlainText() {
        return this.plainText;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<MediaLyrics.Line> getLines() {
        return this.lines;
    }

    @Embeddable
    public static class Line {
        @Column(
            name = "start_ms"
        )
        private Integer startMs;
        @Column(
            name = "text",
            nullable = false
        )
        private String text;

        public Line(Integer startMs, String text) {
            this.startMs = startMs;
            this.text = text;
        }

        protected Line() {
        }

        public Integer getStartMs() {
            return this.startMs;
        }

        public String getText() {
            return this.text;
        }
    }
}
