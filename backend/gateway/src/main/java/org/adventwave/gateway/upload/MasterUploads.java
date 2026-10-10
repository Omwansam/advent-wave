package org.adventwave.gateway.upload;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Where masters are uploaded to (plan §11.7: presigned PUT direct to storage, so a master never
 * passes through the API's memory). The admin API asks this for a URL and hands it to the
 * client, which PUTs the bytes there itself.
 *
 * <p>Locally, {@link LocalMasterUploads} signs URLs for the gateway's own {@code PUT /v1/uploads/{id}}.
 * In production an object-storage implementation returns a presigned PUT to the masters bucket
 * from the same call; nothing above this interface changes. No such implementation exists yet,
 * so without a local media root there is no bean and the upload endpoint answers 501.
 */
public interface MasterUploads {
    /** The key of the master already stored for this item, if any. Masters are never replaced. */
    Optional<String> existingMaster(UUID mediaItemId);

    /**
     * A URL the client PUTs exactly {@code sizeBytes} bytes of {@code contentType} to, storing
     * them at {@code masterStorageKey}. Valid until {@link Ticket#expiresAt()}.
     */
    Ticket issue(UUID mediaItemId, String masterStorageKey, String contentType, long sizeBytes);

    record Ticket(String uploadUrl, Instant expiresAt) {
    }
}
