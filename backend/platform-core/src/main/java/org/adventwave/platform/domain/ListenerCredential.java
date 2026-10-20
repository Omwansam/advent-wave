package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A listener's password and sign-in state (RFC 0005). One per users row that has a password. */
@Entity
@Table(
    name = "listener_credentials"
)
public class ListenerCredential {
    @Id
    @Column(
        name = "user_id",
        nullable = false,
        updatable = false
    )
    private UUID userId;
    @Column(
        name = "password_hash",
        nullable = false
    )
    private String passwordHash;
    @Column(
        name = "email_verified_at"
    )
    private Instant emailVerifiedAt;
    @Column(
        name = "failed_logins",
        nullable = false
    )
    private int failedLogins;
    @Column(
        name = "locked_until"
    )
    private Instant lockedUntil;
    @Column(
        name = "token_version",
        nullable = false
    )
    private int tokenVersion;
    @Column(
        name = "password_changed_at",
        nullable = false
    )
    private Instant passwordChangedAt = Instant.now();
    @Column(
        name = "last_login_at"
    )
    private Instant lastLoginAt;
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

    public ListenerCredential(UUID userId, String passwordHash) {
        this.userId = userId;
        this.passwordHash = passwordHash;
    }

    protected ListenerCredential() {
    }

    public boolean isLocked(Instant now) {
        return this.lockedUntil != null && this.lockedUntil.isAfter(now);
    }

    /** Ends every session issued so far: their `ver` no longer matches. */
    public void revokeSessions() {
        this.tokenVersion++;
    }

    public UUID getUserId() {
        return this.userId;
    }

    public String getPasswordHash() {
        return this.passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Instant getEmailVerifiedAt() {
        return this.emailVerifiedAt;
    }

    public void setEmailVerifiedAt(Instant emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public int getFailedLogins() {
        return this.failedLogins;
    }

    public void setFailedLogins(int failedLogins) {
        this.failedLogins = failedLogins;
    }

    public Instant getLockedUntil() {
        return this.lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public int getTokenVersion() {
        return this.tokenVersion;
    }

    public Instant getPasswordChangedAt() {
        return this.passwordChangedAt;
    }

    public void setPasswordChangedAt(Instant passwordChangedAt) {
        this.passwordChangedAt = passwordChangedAt;
    }

    public Instant getLastLoginAt() {
        return this.lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
