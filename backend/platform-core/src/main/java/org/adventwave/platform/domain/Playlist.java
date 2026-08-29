package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;

@Entity
@Table(
    name = "playlists"
)
public class Playlist {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        name = "owner_id"
    )
    private UUID ownerId;
    @Column(
        nullable = false
    )
    private String title;
    @Column
    private String description;
    @Column(
        name = "cover_url"
    )
    private String coverUrl;
    @Column(
        name = "is_curated",
        nullable = false
    )
    private boolean curated;
    @Column(
        name = "is_public",
        nullable = false
    )
    private boolean publicPlaylist = true;
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
        name = "legacy_id"
    )
    private String legacyId;

    public Playlist(UUID ownerId, String title, String description, String coverUrl) {
        this.ownerId = ownerId;
        this.title = title;
        this.description = description;
        this.coverUrl = coverUrl;
        this.curated = ownerId == null;
    }

    @Generated
    public UUID getId() {
        return this.id;
    }

    @Generated
    public UUID getOwnerId() {
        return this.ownerId;
    }

    @Generated
    public String getTitle() {
        return this.title;
    }

    @Generated
    public String getDescription() {
        return this.description;
    }

    @Generated
    public String getCoverUrl() {
        return this.coverUrl;
    }

    @Generated
    public boolean isCurated() {
        return this.curated;
    }

    @Generated
    public boolean isPublicPlaylist() {
        return this.publicPlaylist;
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
    public String getLegacyId() {
        return this.legacyId;
    }

    @Generated
    public void setId(final UUID id) {
        this.id = id;
    }

    @Generated
    public void setOwnerId(final UUID ownerId) {
        this.ownerId = ownerId;
    }

    @Generated
    public void setTitle(final String title) {
        this.title = title;
    }

    @Generated
    public void setDescription(final String description) {
        this.description = description;
    }

    @Generated
    public void setCoverUrl(final String coverUrl) {
        this.coverUrl = coverUrl;
    }

    @Generated
    public void setCurated(final boolean curated) {
        this.curated = curated;
    }

    @Generated
    public void setPublicPlaylist(final boolean publicPlaylist) {
        this.publicPlaylist = publicPlaylist;
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
    public void setLegacyId(final String legacyId) {
        this.legacyId = legacyId;
    }

    @Generated
    public Playlist() {
    }
}
