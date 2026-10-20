package org.adventwave.catalog.media;

import java.time.Duration;

/**
 * Where a stored asset's bytes are fetched from (RFC 0006). The gateway's signed playback redirect
 * ends here: with object storage, a presigned GET on the derived bucket; locally, the media origin
 * plus the key. The catalogue never builds a storage URL itself.
 */
public interface AssetUrls {
    /**
     * A URL for {@code storageKey}, good for at least {@code validFor}. A player keeps making range
     * requests to it until the recording ends, so callers ask for longer than the recording.
     */
    String url(String storageKey, Duration validFor);
}
