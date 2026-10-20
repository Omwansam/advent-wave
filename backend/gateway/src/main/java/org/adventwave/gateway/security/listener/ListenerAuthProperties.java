package org.adventwave.gateway.security.listener;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Listener accounts (RFC 0005): tokens, the brute-force guard, the password rule, the emailed links. */
@ConfigurationProperties(prefix = "adventwave.auth.listener")
public class ListenerAuthProperties {
    /**
     * HMAC key for listener tokens, at least 32 bytes. Distinct from the admin and dev secrets:
     * each kind of token verifies only with its own key.
     */
    private String tokenSecret = "dev-only-listener-token-secret-at-least-32-bytes-change-me";
    /**
     * A month: people stay signed in to a music app. Every request re-checks the token version,
     * so a password change or sign-out-everywhere still ends a stolen session at once.
     */
    private Duration tokenTtl = Duration.ofDays(30);
    /** More forgiving than staff accounts: a listener on a phone keyboard mistypes. */
    private int maxFailedLogins = 10;
    private Duration lockout = Duration.ofMinutes(15);
    /** NIST SP 800-63B's floor for a user-chosen password; bcrypt reads at most 72 bytes. */
    private int minPasswordLength = 8;
    private Duration passwordResetTtl = Duration.ofHours(1);
    private Duration emailVerificationTtl = Duration.ofDays(7);
    /** At most this many reset or verification emails per account per hour. */
    private int maxEmailsPerHour = 3;
    /** Where the emailed links point: the listener web app's origin, e.g. https://app.adventwave.org. */
    private String appBaseUrl = "http://localhost:5173";

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
    public Duration getPasswordResetTtl() { return this.passwordResetTtl; }
    public void setPasswordResetTtl(Duration passwordResetTtl) { this.passwordResetTtl = passwordResetTtl; }
    public Duration getEmailVerificationTtl() { return this.emailVerificationTtl; }
    public void setEmailVerificationTtl(Duration emailVerificationTtl) { this.emailVerificationTtl = emailVerificationTtl; }
    public int getMaxEmailsPerHour() { return this.maxEmailsPerHour; }
    public void setMaxEmailsPerHour(int maxEmailsPerHour) { this.maxEmailsPerHour = maxEmailsPerHour; }
    public String getAppBaseUrl() { return this.appBaseUrl; }
    public void setAppBaseUrl(String appBaseUrl) { this.appBaseUrl = appBaseUrl; }
}
