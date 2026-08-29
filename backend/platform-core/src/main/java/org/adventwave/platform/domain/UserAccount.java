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
    name = "users"
)
public class UserAccount {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        name = "external_auth_id",
        nullable = false,
        unique = true,
        updatable = false
    )
    private String externalAuthId;
    @Column(
        nullable = false,
        unique = true
    )
    private String email;
    @Column(
        name = "display_name",
        nullable = false
    )
    private String displayName;
    @Column
    private String region;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();

    public UserAccount(String externalAuthId, String email, String displayName, String region) {
        this.externalAuthId = externalAuthId;
        this.email = email;
        this.displayName = displayName;
        this.region = region;
    }

    @Generated
    public UUID getId() {
        return this.id;
    }

    @Generated
    public String getExternalAuthId() {
        return this.externalAuthId;
    }

    @Generated
    public String getEmail() {
        return this.email;
    }

    @Generated
    public String getDisplayName() {
        return this.displayName;
    }

    @Generated
    public String getRegion() {
        return this.region;
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
    public void setExternalAuthId(final String externalAuthId) {
        this.externalAuthId = externalAuthId;
    }

    @Generated
    public void setEmail(final String email) {
        this.email = email;
    }

    @Generated
    public void setDisplayName(final String displayName) {
        this.displayName = displayName;
    }

    @Generated
    public void setRegion(final String region) {
        this.region = region;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public UserAccount() {
    }
}
