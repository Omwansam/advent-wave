package org.adventwave.catalog.media;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.adventwave.catalog.CatalogProperties;
import org.springframework.stereotype.Component;

public interface SignedUrlMinter {
    SignedUrlMinter.Signed mint(UUID mediaItemId, String profile, UUID userId, Duration ttl);

    boolean verify(UUID mediaItemId, String profile, UUID userId, long expiresAt, String signature);

    @Component
    public static class LocalHmacSignedUrlMinter implements SignedUrlMinter {
        private static final String ALGORITHM = "HmacSHA256";
        private final CatalogProperties properties;

        public LocalHmacSignedUrlMinter(CatalogProperties properties) {
            this.properties = properties;
        }

        @Override
        public SignedUrlMinter.Signed mint(UUID mediaItemId, String profile, UUID userId, Duration ttl) {
            long i = Instant.now().plus(ttl).getEpochSecond();
            String s = this.sign(this.payload(mediaItemId, profile, userId, i));
            String s1 = "%s/v1/media/%s/stream/%s?exp=%d&uid=%s&sig=%s".formatted(this.properties.getApiBaseUrl(), mediaItemId, profile, i, userId, s);
            return new SignedUrlMinter.Signed(s1, i);
        }

        @Override
        public boolean verify(UUID mediaItemId, String profile, UUID userId, long expiresAt, String signature) {
            if (signature != null && Instant.now().getEpochSecond() <= expiresAt) {
                String s = this.sign(this.payload(mediaItemId, profile, userId, expiresAt));
                return this.constantTimeEquals(s, signature);
            } else {
                return false;
            }
        }

        private String payload(UUID mediaItemId, String profile, UUID userId, long expiresAt) {
            return mediaItemId + "|" + profile + "|" + userId + "|" + expiresAt;
        }

        private String sign(String payload) {
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(this.properties.getSigningSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            } catch (Exception exception) {
                throw new IllegalStateException("cannot sign playback URL", exception);
            }
        }

        private boolean constantTimeEquals(String expected, String actual) {
            byte[] abyte = expected.getBytes(StandardCharsets.UTF_8);
            byte[] abyte1 = actual.getBytes(StandardCharsets.UTF_8);
            return MessageDigest.isEqual(abyte, abyte1);
        }
    }

    public record Signed(String url, long expiresAtEpochSeconds) {
    }
}
