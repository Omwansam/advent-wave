package org.adventwave.gateway.security.listener;

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
import org.adventwave.platform.domain.ListenerCredential;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Listener bearer tokens for AdventWave's own accounts (RFC 0005). {@code sub} is the users row's
 * external_auth_id, exactly as an IdP's would be, so the rest of the gateway resolves the listener
 * the same way whoever issued the token; {@code uid} names the credentials to check {@code ver}
 * against. A token from before the account's last sign-out-everywhere, password change or reset
 * is refused on its next request.
 */
@Component
public class ListenerTokenService {
    /** Distinguishes these tokens from admin, dev-issuer and IdP tokens, each verified with its own key. */
    public static final String ISSUER = "adventwave";
    public static final String USER_ID_CLAIM = "uid";
    public static final String VERSION_CLAIM = "ver";

    private final ListenerAuthProperties properties;
    private final PlatformRepositories.ListenerCredentialRepository credentials;

    public ListenerTokenService(ListenerAuthProperties properties, PlatformRepositories.ListenerCredentialRepository credentials) {
        this.properties = properties;
        this.credentials = credentials;
        if (properties.getTokenSecret() == null || properties.getTokenSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("adventwave.auth.listener.token-secret must be at least 32 bytes (HS256)");
        }
    }

    public String mint(UserAccount user, ListenerCredential credential) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .subject(user.getExternalAuthId())
            .jwtID(UUID.randomUUID().toString())
            .claim(USER_ID_CLAIM, user.getId().toString())
            .claim("email", user.getEmail())
            .claim("name", user.getDisplayName())
            .claim(VERSION_CLAIM, credential.getTokenVersion())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plus(this.properties.getTokenTtl())))
            .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), claims);
        try {
            jwt.sign(new MACSigner(this.properties.getTokenSecret().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("could not sign a listener token", e);
        }
        return jwt.serialize();
    }

    public long ttlSeconds() {
        return this.properties.getTokenTtl().toSeconds();
    }

    /** Verifies signature, expiry, issuer, and that the session has not been ended since. */
    public JwtDecoder decoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withSecretKey(new SecretKeySpec(this.properties.getTokenSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
            .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(ISSUER), this.currentSession()));
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> currentSession() {
        return jwt -> {
            UUID userId;
            try {
                userId = UUID.fromString(jwt.getClaimAsString(USER_ID_CLAIM));
            } catch (Exception e) {
                return failure("malformed listener token");
            }
            ListenerCredential credential = this.credentials.findById(userId).orElse(null);
            if (credential == null) {
                return failure("this account no longer exists");
            }
            Object version = jwt.getClaim(VERSION_CLAIM);
            if (!(version instanceof Number n) || n.intValue() != credential.getTokenVersion()) {
                return failure("this session has ended; sign in again");
            }
            return OAuth2TokenValidatorResult.success();
        };
    }

    private static OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", description, null));
    }
}
