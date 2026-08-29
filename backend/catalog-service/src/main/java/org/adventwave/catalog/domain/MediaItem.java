package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;
import org.adventwave.contracts.api.MediaType;

@Entity
@Table(
    name = "media_items"
)
public class MediaItem {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        name = "media_type",
        nullable = false
    )
    private MediaType mediaType;
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
    @ManyToOne(
        fetch = FetchType.LAZY
    )
    @JoinColumn(
        name = "album_id"
    )
    private Album album;
    @Column(
        name = "duration_ms",
        nullable = false
    )
    private int durationMs;
    @Column(
        name = "cover_url"
    )
    private String coverUrl;
    @Column
    private String genre;
    @Column
    private String language;
    @Column
    private String region;
    @Column(
        nullable = false
    )
    private short popularity = 60;
    @Column(
        nullable = false
    )
    private String status = "draft";
    @Column(
        name = "license_id"
    )
    private UUID licenseId;
    @Column(
        name = "published_at"
    )
    private Instant publishedAt;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();
    @Column(
        name = "loudness_lufs"
    )
    private BigDecimal loudnessLufs;
    @Column(
        name = "true_peak_dbfs"
    )
    private BigDecimal truePeakDbfs;
    @Column(
        name = "master_storage_key"
    )
    private String masterStorageKey;
    @Column(
        name = "legacy_id"
    )
    private String legacyId;
    @Column(
        name = "seed_source_url"
    )
    private String seedSourceUrl;

    @Generated
    public UUID getId() {
        return this.id;
    }

    @Generated
    public MediaType getMediaType() {
        return this.mediaType;
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
    public Album getAlbum() {
        return this.album;
    }

    @Generated
    public int getDurationMs() {
        return this.durationMs;
    }

    @Generated
    public String getCoverUrl() {
        return this.coverUrl;
    }

    @Generated
    public String getGenre() {
        return this.genre;
    }

    @Generated
    public String getLanguage() {
        return this.language;
    }

    @Generated
    public String getRegion() {
        return this.region;
    }

    @Generated
    public short getPopularity() {
        return this.popularity;
    }

    @Generated
    public String getStatus() {
        return this.status;
    }

    @Generated
    public UUID getLicenseId() {
        return this.licenseId;
    }

    @Generated
    public Instant getPublishedAt() {
        return this.publishedAt;
    }

    @Generated
    public Instant getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    @Generated
    public BigDecimal getLoudnessLufs() {
        return this.loudnessLufs;
    }

    @Generated
    public BigDecimal getTruePeakDbfs() {
        return this.truePeakDbfs;
    }

    @Generated
    public String getMasterStorageKey() {
        return this.masterStorageKey;
    }

    @Generated
    public String getLegacyId() {
        return this.legacyId;
    }

    @Generated
    public String getSeedSourceUrl() {
        return this.seedSourceUrl;
    }

    @Generated
    public void setId(final UUID id) {
        this.id = id;
    }

    @Generated
    public void setMediaType(final MediaType mediaType) {
        this.mediaType = mediaType;
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
    public void setAlbum(final Album album) {
        this.album = album;
    }

    @Generated
    public void setDurationMs(final int durationMs) {
        this.durationMs = durationMs;
    }

    @Generated
    public void setCoverUrl(final String coverUrl) {
        this.coverUrl = coverUrl;
    }

    @Generated
    public void setGenre(final String genre) {
        this.genre = genre;
    }

    @Generated
    public void setLanguage(final String language) {
        this.language = language;
    }

    @Generated
    public void setRegion(final String region) {
        this.region = region;
    }

    @Generated
    public void setPopularity(final short popularity) {
        this.popularity = popularity;
    }

    @Generated
    public void setStatus(final String status) {
        this.status = status;
    }

    @Generated
    public void setLicenseId(final UUID licenseId) {
        this.licenseId = licenseId;
    }

    @Generated
    public void setPublishedAt(final Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setUpdatedAt(final Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public void setLoudnessLufs(final BigDecimal loudnessLufs) {
        this.loudnessLufs = loudnessLufs;
    }

    @Generated
    public void setTruePeakDbfs(final BigDecimal truePeakDbfs) {
        this.truePeakDbfs = truePeakDbfs;
    }

    @Generated
    public void setMasterStorageKey(final String masterStorageKey) {
        this.masterStorageKey = masterStorageKey;
    }

    @Generated
    public void setLegacyId(final String legacyId) {
        this.legacyId = legacyId;
    }

    @Generated
    public void setSeedSourceUrl(final String seedSourceUrl) {
        this.seedSourceUrl = seedSourceUrl;
    }
}
