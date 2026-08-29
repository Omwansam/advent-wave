package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;

@Entity
@Table(
    name = "artists"
)
public class Artist {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        nullable = false,
        unique = true
    )
    private String name;
    @Column(
        nullable = false,
        unique = true
    )
    private String slug;
    @Column(
        name = "cover_url"
    )
    private String coverUrl;
    @Column
    private String bio;
    @Column(
        name = "church_id"
    )
    private UUID churchId;
    @Column(
        nullable = false
    )
    private boolean verified;
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
    public String getName() {
        return this.name;
    }

    @Generated
    public String getSlug() {
        return this.slug;
    }

    @Generated
    public String getCoverUrl() {
        return this.coverUrl;
    }

    @Generated
    public String getBio() {
        return this.bio;
    }

    @Generated
    public UUID getChurchId() {
        return this.churchId;
    }

    @Generated
    public boolean isVerified() {
        return this.verified;
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
    public void setName(final String name) {
        this.name = name;
    }

    @Generated
    public void setSlug(final String slug) {
        this.slug = slug;
    }

    @Generated
    public void setCoverUrl(final String coverUrl) {
        this.coverUrl = coverUrl;
    }

    @Generated
    public void setBio(final String bio) {
        this.bio = bio;
    }

    @Generated
    public void setChurchId(final UUID churchId) {
        this.churchId = churchId;
    }

    @Generated
    public void setVerified(final boolean verified) {
        this.verified = verified;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }
}
