package org.adventwave.gateway.audio;

import java.util.UUID;

/** One transcode to run: the fields of an {@code audio.transcode.v1} {@code requested} message the worker needs. */
public record TranscodeJob(UUID mediaItemId, String mediaType, String masterStorageKey, int attempt) {
    TranscodeJob nextAttempt() {
        return new TranscodeJob(this.mediaItemId, this.mediaType, this.masterStorageKey, this.attempt + 1);
    }
}
