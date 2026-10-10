package org.adventwave.gateway.security.admin;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Admin-portal bearer tokens. A token only says who signed in and which session generation it
 * belongs to ({@code ver}); what the bearer may do is decided per request from the stored
 * account (AdminJwtAuthenticationConverter), never from claims. The {@code role} claim is a
 * convenience for the client's first render and is ignored by the server.
 */
@Component
public class AdminTokenService {
    /** Distinguishes admin tokens from listener tokens, which are verified with another key. */
    public static final String ISSUER = "adventwave-admin";
    public static final String VERSION_CLAIM = "ver";

    private final AdminAuthProperties properties;

    public AdminTokenService(AdminAuthProperties properties) {
        this.properties = properties;
        if (properties.getTokenSecret() == null || properties.getTokenSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("adventwave.auth.admin.token-secret must be at least 32 bytes (HS256)");
        }
    }

    public String mint(AdminAccount account) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .subject(account.getId().toString())
            .jwtID(UUID.randomUUID().toString())
            .claim("email", account.getEmail())
            .claim("name", account.getDisplayName())
            .claim("role", account.getRole())
            .claim(VERSION_CLAIM, account.getTokenVersion())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plus(this.properties.getTokenTtl())))
            .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), claims);
        try {
            jwt.sign(new MACSigner(this.properties.getTokenSecret().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("could not sign an admin token", e);
        }
        return jwt.serialize();
    }

    public long ttlSeconds() {
        return this.properties.getTokenTtl().toSeconds();
    }

    /** Verifies signature, expiry and issuer of admin tokens. */
    public JwtDecoder decoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withSecretKey(new SecretKeySpec(this.properties.getTokenSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
            .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        return decoder;
    }
}
