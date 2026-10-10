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
        // With an external IdP the dev issuer and its decoder do not exist (SecurityConfig).
        boolean externalIdp = !env.getProperty("spring.security.oauth2.resourceserver.jwt.issuer-uri", "").isBlank();
        if (!externalIdp) {
            if (env.getProperty("adventwave.auth.dev-issuer", Boolean.class, false)) {
                problems.add("adventwave.auth.dev-issuer is on (ADVENTWAVE_DEV_ISSUER=false): anyone can mint a listener token for any email");
            }
            checkSecret(env, "adventwave.auth.dev-secret", "ADVENTWAVE_DEV_SECRET", problems);
        }
        checkSecret(env, "adventwave.auth.admin.token-secret", "ADVENTWAVE_ADMIN_TOKEN_SECRET", problems);
        checkSecret(env, "adventwave.catalog.signing-secret", "ADVENTWAVE_SIGNING_SECRET", problems);
        // The upload signer exists only when the gateway is its own master store.
        if (!env.getProperty("adventwave.catalog.local-media-root", "").isBlank()) {
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
