package org.adventwave.gateway.upload;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.gateway.audio.AudioProperties;
import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;

/**
 * Local development's stand-in for a presigned PUT to the masters bucket: a URL for the gateway's
 * own {@code PUT /v1/uploads/{id}} ({@link LocalUploadController}), authorised by an HMAC-SHA256
 * over {@code id|key|exp} and nothing else, exactly as a presigned URL is. Modelled on
 * {@code SignedUrlMinter}, with its own secret: a playback URL must never sign an upload.
 *
 * <p>The directory is {@code adventwave.catalog.local-media-root}, the one tools/transcode.py and
 * the local media origin use; only {@code derived/} under it is ever served.
 */
@Component
@Conditional(LocalMediaRootCondition.class)
public class LocalMasterUploads implements MasterUploads {
    private static final String ALGORITHM = "HmacSHA256";

    private final CatalogProperties catalog;
    private final AudioProperties audio;

    public LocalMasterUploads(CatalogProperties catalog, AudioProperties audio) {
        this.catalog = catalog;
        this.audio = audio;
    }

    public Path root() {
        return Path.of(this.catalog.getLocalMediaRoot()).toAbsolutePath().normalize();
    }

    public Path mastersDir(UUID mediaItemId) {
        return this.root().resolve("masters").resolve(mediaItemId.toString());
    }

    @Override
    public Optional<String> existingMaster(UUID mediaItemId) {
        Path dir = this.mastersDir(mediaItemId);
        if (!Files.isDirectory(dir)) return Optional.empty();
        try (DirectoryStream<Path> files = Files.newDirectoryStream(dir, "original.*")) {
            for (Path f : files) {
                if (Files.isRegularFile(f)) return Optional.of("masters/" + mediaItemId + "/" + f.getFileName());
            }
            return Optional.empty();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public Ticket issue(UUID mediaItemId, String masterStorageKey, String contentType, long sizeBytes) {
        long exp = Instant.now().plus(this.audio.getUploadUrlTtl()).getEpochSecond();
        String url = "%s/v1/uploads/%s?key=%s&exp=%d&sig=%s".formatted(
            this.catalog.getApiBaseUrl(), mediaItemId, URLEncoder.encode(masterStorageKey, StandardCharsets.UTF_8),
            exp, this.sign(mediaItemId, masterStorageKey, exp));
        return new Ticket(url, Instant.ofEpochSecond(exp));
    }

    /** Signature valid, compared in constant time, and not past its expiry. */
    public boolean verify(UUID mediaItemId, String masterStorageKey, long exp, String signature) {
        if (signature == null || masterStorageKey == null || Instant.now().getEpochSecond() > exp) return false;
        byte[] expected = this.sign(mediaItemId, masterStorageKey, exp).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, signature.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(UUID mediaItemId, String masterStorageKey, long exp) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(this.audio.getUploadSigningSecret().getBytes(StandardCharsets.UTF_8), ALGORITHM));
            byte[] digest = mac.doFinal((mediaItemId + "|" + masterStorageKey + "|" + exp).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("cannot sign upload URL", e);
        }
    }
}
