package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A single-use link sent by email: a password reset or an email verification (RFC 0005). Only
 * the SHA-256 of the token is stored; the token itself exists in the email and nowhere else.
 */
@Entity
@Table(
    name = "listener_tokens"
)
public class ListenerToken {
    public static final String PASSWORD_RESET = "password_reset";
    public static final String EMAIL_VERIFICATION = "email_verification";

    @Id
    @Column(
        name = "token_hash",
        nullable = false,
        updatable = false
    )
    private String tokenHash;
    @Column(
        name = "user_id",
        nullable = false,
        updatable = false
    )
    private UUID userId;
    @Column(
        name = "purpose",
        nullable = false,
        updatable = false
    )
    private String purpose;
    @Column(
        name = "expires_at",
        nullable = false,
        updatable = false
    )
    private Instant expiresAt;
    @Column(
        name = "used_at"
    )
    private Instant usedAt;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();

    public ListenerToken(String tokenHash, UUID userId, String purpose, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.purpose = purpose;
        this.expiresAt = expiresAt;
    }

    protected ListenerToken() {
    }

    public boolean isUsable(String purpose, Instant now) {
        return this.purpose.equals(purpose) && this.usedAt == null && this.expiresAt.isAfter(now);
    }

    public String getTokenHash() {
        return this.tokenHash;
    }

    public UUID getUserId() {
        return this.userId;
    }

    public String getPurpose() {
        return this.purpose;
    }

    public Instant getExpiresAt() {
        return this.expiresAt;
    }

    public Instant getUsedAt() {
        return this.usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }
}
