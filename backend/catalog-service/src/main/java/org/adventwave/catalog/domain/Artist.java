package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.Ensemble;

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
    /** What the profile is (RFC 0009); converted by ArtistKindConverter. */
    @Column(
        nullable = false
    )
    private ArtistKind kind = ArtistKind.CHOIR;
    /** A choir's ensemble; null for every other kind (artists_ensemble_only_choirs). */
    @Column
    private Ensemble ensemble;
    /** The church profile this one belongs to; null for a church and for an independent profile. */
    @Column(
        name = "home_church_id"
    )
    private UUID homeChurchId;
    @Column(
        name = "conference_id"
    )
    private String conferenceId;
    @Column
    private String location;
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
    public ArtistKind getKind() {
        return this.kind;
    }

    @Generated
    public Ensemble getEnsemble() {
        return this.ensemble;
    }

    @Generated
    public UUID getHomeChurchId() {
        return this.homeChurchId;
    }

    @Generated
    public String getConferenceId() {
        return this.conferenceId;
    }

    @Generated
    public String getLocation() {
        return this.location;
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

    @Generated
    public void setKind(final ArtistKind kind) {
        this.kind = kind;
    }

    @Generated
    public void setEnsemble(final Ensemble ensemble) {
        this.ensemble = ensemble;
    }

    @Generated
    public void setHomeChurchId(final UUID homeChurchId) {
        this.homeChurchId = homeChurchId;
    }

    @Generated
    public void setConferenceId(final String conferenceId) {
        this.conferenceId = conferenceId;
    }

    @Generated
    public void setLocation(final String location) {
        this.location = location;
    }
}
