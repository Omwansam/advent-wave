package org.adventwave.gateway.security.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A staff account of the admin portal — the admin_accounts table (V6). */
@Entity
@Table(name = "admin_accounts")
public class AdminAccount {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id = UUID.randomUUID();
    @Column(nullable = false)
    private String email;
    @Column(name = "display_name", nullable = false)
    private String displayName;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(nullable = false)
    private String role;
    @Column(nullable = false)
    private boolean active = true;
    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = true;
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;
    @Column(name = "failed_logins", nullable = false)
    private int failedLogins;
    @Column(name = "locked_until")
    private Instant lockedUntil;
    @Column(name = "last_login_at")
    private Instant lastLoginAt;
    @Column(name = "password_changed_at", nullable = false)
    private Instant passwordChangedAt = Instant.now();
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected AdminAccount() {
    }

    public AdminAccount(String email, String displayName, String passwordHash, AdminRole role, boolean mustChangePassword) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.role = role.wireValue();
        this.mustChangePassword = mustChangePassword;
    }

    public AdminRole adminRole() {
        return AdminRole.fromWire(this.role);
    }

    public boolean isLocked(Instant now) {
        return this.lockedUntil != null && this.lockedUntil.isAfter(now);
    }

    /** Ends every session issued so far: their tokens carry the old version. */
    public void revokeSessions() {
        this.tokenVersion++;
    }

    public UUID getId() { return this.id; }
    public String getEmail() { return this.email; }
    public void setEmail(String email) { this.email = email; }
    public String getDisplayName() { return this.displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getPasswordHash() { return this.passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return this.role; }
    public void setRole(AdminRole role) { this.role = role.wireValue(); }
    public boolean isActive() { return this.active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isMustChangePassword() { return this.mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }
    public int getTokenVersion() { return this.tokenVersion; }
    public int getFailedLogins() { return this.failedLogins; }
    public void setFailedLogins(int failedLogins) { this.failedLogins = failedLogins; }
    public Instant getLockedUntil() { return this.lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public Instant getLastLoginAt() { return this.lastLoginAt; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public Instant getPasswordChangedAt() { return this.passwordChangedAt; }
    public void setPasswordChangedAt(Instant passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
    public Instant getCreatedAt() { return this.createdAt; }
    public Instant getUpdatedAt() { return this.updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
