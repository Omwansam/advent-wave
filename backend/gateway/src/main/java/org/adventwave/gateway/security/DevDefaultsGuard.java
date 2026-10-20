package org.adventwave.gateway.security;

import java.util.ArrayList;
import java.util.List;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Refuses to start with development credentials outside local development.
 *
 * <p>The base configuration turns the email-only token issuer on and defaults every signing
 * secret to a "dev-only" value published in this repository, so that the {@code local} profile
 * works with no setup. A deployment that forgot to override any one of them would accept
 * listener tokens, admin tokens or signed URLs that anyone can mint. Failing at startup, with
 * the names of the settings to provide, is cheaper than finding that out from a breach.
 *
 * <p>{@code adventwave.security.allow-dev-defaults} switches the check off: the {@code local}
 * profile sets it, and so do the integration tests and CI's contract regeneration.
 */
@Component
public class DevDefaultsGuard {
    static final String ALLOW = "adventwave.security.allow-dev-defaults";
    private static final int MIN_SECRET_LENGTH = 32;

    public DevDefaultsGuard(Environment env) {
        if (env.getProperty(ALLOW, Boolean.class, false)) return;
        List<String> problems = new ArrayList<>();
        // With the dev issuer off, its decoder does not exist either (SecurityConfig), so its
        // secret no longer matters; with it on, nothing else does.
        if (env.getProperty("adventwave.auth.dev-issuer", Boolean.class, false)) {
            problems.add("adventwave.auth.dev-issuer is on (ADVENTWAVE_DEV_ISSUER=false): anyone can mint a listener token for any email");
        }
        checkSecret(env, "adventwave.auth.listener.token-secret", "ADVENTWAVE_LISTENER_TOKEN_SECRET", problems);
        // Listener accounts email their reset and verification links (RFC 0005). The log mailer
        // writes those links to the log, where anyone who can read it could take over an account.
        if (!"smtp".equals(env.getProperty("adventwave.mail.mode", "log"))) {
            problems.add("adventwave.mail.mode is not smtp (ADVENTWAVE_MAIL_MODE=smtp, with SPRING_MAIL_HOST, _PORT, _USERNAME, _PASSWORD): "
                + "password-reset links would be written to the log instead of emailed");
        }
        String appBase = env.getProperty("adventwave.auth.listener.app-base-url", "");
        if (!appBase.startsWith("https://") || appBase.contains("localhost")) {
            problems.add("adventwave.auth.listener.app-base-url is '" + appBase + "' (set ADVENTWAVE_APP_BASE_URL to the listener app's "
                + "https origin): emailed links must point at the real site, over HTTPS");
        }
        checkSecret(env, "adventwave.auth.admin.token-secret", "ADVENTWAVE_ADMIN_TOKEN_SECRET", problems);
        // Local storage serves derived audio from /media-storage with no signature at all, and
        // keeps masters on this one disk (RFC 0006). Fine on a laptop; never for real listeners.
        if (!"s3".equals(env.getProperty("adventwave.storage.mode", "local"))) {
            problems.add("adventwave.storage.mode is not s3 (ADVENTWAVE_STORAGE_MODE=s3 with ADVENTWAVE_S3_*): "
                + "audio would be served from this machine without signed URLs");
        }
        checkSecret(env, "adventwave.catalog.signing-secret", "ADVENTWAVE_SIGNING_SECRET", problems);
        // The upload signer exists only when the gateway is its own master store.
        if (!env.getProperty("adventwave.catalog.local-media-root", "").isBlank()
            && !"s3".equals(env.getProperty("adventwave.storage.mode", "local"))) {
            checkSecret(env, "adventwave.audio.upload-signing-secret", "ADVENTWAVE_UPLOAD_SIGNING_SECRET", problems);
        }
        if (!problems.isEmpty()) {
            throw new IllegalStateException("refusing to start with development credentials:\n  - "
                + String.join("\n  - ", problems)
                + "\nProvide the settings above, run with the 'local' profile, or set " + ALLOW
                + "=true (ADVENTWAVE_ALLOW_DEV_DEFAULTS) for a throwaway environment.");
        }
    }

    private static void checkSecret(Environment env, String property, String variable, List<String> problems) {
        String value = env.getProperty(property, "");
        if (value.contains("dev-only") || value.length() < MIN_SECRET_LENGTH) {
            problems.add(property + " is the published development value or shorter than " + MIN_SECRET_LENGTH
                + " characters (set " + variable + ")");
        }
    }
}
