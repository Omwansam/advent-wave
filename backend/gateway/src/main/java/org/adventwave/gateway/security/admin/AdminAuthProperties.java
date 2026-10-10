package org.adventwave.gateway.security.admin;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Sign-in for the admin portal (RFC 0001): tokens, the brute-force guard, the password rule, the first account. */
@ConfigurationProperties(prefix = "adventwave.auth.admin")
public class AdminAuthProperties {
    /** HMAC key for admin tokens, at least 32 bytes. Separate from the listener dev secret: a listener token must never verify as an admin one. */
    private String tokenSecret = "dev-only-admin-token-secret-at-least-32-bytes-change-me";
    /** A working day. Every request re-checks the account, so a disabled one stops at once regardless. */
    private Duration tokenTtl = Duration.ofHours(8);
    /** Consecutive failed sign-ins before the account locks. */
    private int maxFailedLogins = 5;
    private Duration lockout = Duration.ofMinutes(15);
    /** Length is what makes a password strong (NIST SP 800-63B); bcrypt reads at most 72 bytes. */
    private int minPasswordLength = 12;
    /**
     * The first super admin, created at startup only when no admin account exists at all. The
     * operator chose this password in their own secret configuration, so it is not marked for a
     * forced change; accounts created by another admin are.
     */
    private String bootstrapEmail;
    private String bootstrapPassword;
    private String bootstrapName = "Administrator";

    public String getTokenSecret() { return this.tokenSecret; }
    public void setTokenSecret(String tokenSecret) { this.tokenSecret = tokenSecret; }
    public Duration getTokenTtl() { return this.tokenTtl; }
    public void setTokenTtl(Duration tokenTtl) { this.tokenTtl = tokenTtl; }
    public int getMaxFailedLogins() { return this.maxFailedLogins; }
    public void setMaxFailedLogins(int maxFailedLogins) { this.maxFailedLogins = maxFailedLogins; }
    public Duration getLockout() { return this.lockout; }
    public void setLockout(Duration lockout) { this.lockout = lockout; }
    public int getMinPasswordLength() { return this.minPasswordLength; }
    public void setMinPasswordLength(int minPasswordLength) { this.minPasswordLength = minPasswordLength; }
    public String getBootstrapEmail() { return this.bootstrapEmail; }
    public void setBootstrapEmail(String bootstrapEmail) { this.bootstrapEmail = bootstrapEmail; }
    public String getBootstrapPassword() { return this.bootstrapPassword; }
    public void setBootstrapPassword(String bootstrapPassword) { this.bootstrapPassword = bootstrapPassword; }
    public String getBootstrapName() { return this.bootstrapName; }
    public void setBootstrapName(String bootstrapName) { this.bootstrapName = bootstrapName; }
}
