package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Where to put a media item's master (plan §11.7: presigned PUT direct to storage, so a 200 MB
 * WAV never passes through the API). The client PUTs the file's bytes to {@code uploadUrl}
 * itself, then requests the transcode with {@code masterStorageKey}.
 *
 * <p>In production {@code uploadUrl} is an object-storage presigned URL; locally it is the
 * gateway's own signed endpoint, {@code PUT /v1/uploads/{id}}. Either way it carries its own
 * authorisation: the client sends no bearer token with the PUT.
 *
 * @param uploadUrl        absolute URL to send the bytes to, valid until {@code expiresAt}
 * @param method           always {@code PUT}
 * @param masterStorageKey {@code masters/{id}/original.{ext}} — what to pass to the transcode request
 * @param expiresAt        ISO-8601 instant after which {@code uploadUrl} is refused
 */
@JsonInclude(Include.NON_NULL)
public record MasterUploadDto(String uploadUrl, String method, String masterStorageKey, String expiresAt) {
    /**
     * @param filename    the file's name; only its extension is used, and it must be one of wav,
     *                    flac, aif, aiff, mp3, m4a, aac, ogg, opus, mp4, mov, webm
     * @param contentType the file's media type, sent again as the PUT's Content-Type
     * @param sizeBytes   the exact byte count the PUT will carry
     */
    public record UploadRequest(@NotBlank String filename, String contentType, @Min(1) long sizeBytes) {
    }
}
