package org.adventwave.gateway.api;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.adventwave.gateway.admin.AdminConflictException;
import org.adventwave.gateway.audio.AudioProperties;
import org.adventwave.gateway.upload.LocalMasterUploads;
import org.adventwave.gateway.upload.LocalMediaRootCondition;
import org.adventwave.gateway.upload.MasterKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Conditional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Where a local upload URL points: the gateway standing in for the masters bucket, the way
 * {@link LocalMediaOriginConfig} stands in for the CDN. Registered only with a local media root.
 *
 * <p>Behaves like a presigned PUT: the URL's HMAC is the only authorisation (no bearer token,
 * {@code permitAll} in SecurityConfig), the body is the file's bytes and nothing else, and the
 * response says where they landed. The body is streamed to disk, never held in memory, and the
 * master appears under its final name only once every declared byte has arrived — a cancelled or
 * short upload leaves nothing behind. A master that exists is never replaced.
 *
 * <p>{@code @Hidden}: not part of the API contract, any more than the local media origin is. The
 * contract is POST /v1/admin/media/{id}/upload, whose {@code uploadUrl} is opaque — a presigned
 * object-storage URL in production. It also keeps the generated document the same whether or not
 * a local media root is configured.
 */
@Hidden
@RestController
@Conditional(LocalMediaRootCondition.class)
public class LocalUploadController {
    private static final Logger log = LoggerFactory.getLogger(LocalUploadController.class);

    private final LocalMasterUploads uploads;
    private final AudioProperties audio;
    /** One upload per item at a time: two would write the same partial file. */
    private final Set<UUID> inFlight = ConcurrentHashMap.newKeySet();
    /** Makes "no master yet" and "this one is the master" a single step across items' uploads. */
    private final Object commit = new Object();

    public LocalUploadController(LocalMasterUploads uploads, AudioProperties audio) {
        this.uploads = uploads;
        this.audio = audio;
    }

    @PutMapping("/v1/uploads/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    public StoredMaster upload(
        @PathVariable UUID id,
        @RequestParam String key,
        @RequestParam long exp,
        @RequestParam String sig,
        HttpServletRequest request
    ) throws IOException {
        if (!this.uploads.verify(id, key, exp, sig)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "upload URL signature invalid or expired");
        }
        if (!MasterKeys.isKeyFor(id, key)) {
            throw new IllegalArgumentException("not a master key for this item: " + key);
        }
        long declared = request.getContentLengthLong();
        if (declared < 0) {
            throw new ResponseStatusException(HttpStatus.LENGTH_REQUIRED, "Content-Length is required; what arrives is checked against it");
        }
        if (declared > this.audio.getMaxUploadBytes().toBytes()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "the master is " + declared + " bytes; the limit is " + this.audio.getMaxUploadBytes().toBytes() + " bytes");
        }
        this.refuseIfStored(id, "");
        if (!this.inFlight.add(id)) {
            throw new AdminConflictException("an upload for this item is already in progress");
        }

        String ext = MasterKeys.extensionOfKey(key);
        Path dir = this.uploads.mastersDir(id);
        Path partial = dir.resolve(".partial-original." + ext);
        Path target = dir.resolve("original." + ext);
        try {
            Files.createDirectories(dir);
            long written;
            try (InputStream body = request.getInputStream()) {
                written = Files.copy(body, partial, StandardCopyOption.REPLACE_EXISTING);
            }
            if (written != declared) {
                throw new IllegalArgumentException("received " + written + " bytes but Content-Length said " + declared + "; nothing was stored");
            }
            synchronized (this.commit) {
                this.refuseIfStored(id, " while this upload ran");
                Files.move(partial, target, StandardCopyOption.ATOMIC_MOVE);
            }
            log.info("master stored at {} ({} bytes)", key, written);
            return new StoredMaster(key, written);
        } finally {
            Files.deleteIfExists(partial);
            this.inFlight.remove(id);
        }
    }

    private void refuseIfStored(UUID id, String when) {
        Optional<String> stored = this.uploads.existingMaster(id);
        if (stored.isPresent()) {
            throw new AdminConflictException(stored.get() + " was already stored" + when + "; masters are never replaced");
        }
    }

    /** @param masterStorageKey where the bytes are now; pass it to the transcode request */
    public record StoredMaster(String masterStorageKey, long byteSize) {
    }
}
