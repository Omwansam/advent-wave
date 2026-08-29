package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Generated;

@Entity
@Table(
    name = "albums"
)
public class Album {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        nullable = false
    )
    private String title;
    @ManyToOne(
        fetch = FetchType.LAZY,
        optional = false
    )
    @JoinColumn(
        name = "artist_id",
        nullable = false
    )
    private Artist artist;
    @Column(
        name = "cover_url"
    )
    private String coverUrl;
    @Column(
        name = "release_date"
    )
    private LocalDate releaseDate;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();

    @Generated
    public UUID getId() {
        return this.id;
    }

    @Generated
    public String getTitle() {
        return this.title;
    }

    @Generated
    public Artist getArtist() {
        return this.artist;
    }

    @Generated
    public String getCoverUrl() {
        return this.coverUrl;
    }

    @Generated
    public LocalDate getReleaseDate() {
        return this.releaseDate;
    }

    @Generated
    public Instant getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public void setId(final UUID id) {
        this.id = id;
    }

    @Generated
    public void setTitle(final String title) {
        this.title = title;
    }

    @Generated
    public void setArtist(final Artist artist) {
        this.artist = artist;
    }

    @Generated
    public void setCoverUrl(final String coverUrl) {
        this.coverUrl = coverUrl;
    }

    @Generated
    public void setReleaseDate(final LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }
}
