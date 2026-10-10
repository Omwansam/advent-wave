package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.UUID;

/**
 * Every media_items column an operator needs, plus the transcode outputs. The listener-facing
 * TrackDto is a projection of a published item; this is the item at any status.
 */
@JsonInclude(Include.NON_NULL)
public record AdminMediaItemDto(
    String id,
    String mediaType,
    String title,
    String artistId,
    String albumId,
    int durationMs,
    String coverUrl,
    String genre,
    String language,
    String region,
    int popularity,
    String status,
    String licenseId,
    String masterStorageKey,
    Double loudnessLufs,
    Double truePeakDbfs,
    String publishedAt,
    String createdAt,
    String updatedAt,
    List<Asset> assets,
    /** Review flags from the last completed transcode: lossy_master, long_leading_silence, long_trailing_silence. Never block publication. */
    List<String> reviewFlags,
    /** Why the last transcode failed — the worker's message and stage. Present only when status is failed. */
    String failureReason
) {
    /** One row of media_assets — one transcode output. */
    public record Asset(String profile, String codec, int bitrateKbps, String container, int sampleRateHz, int channels, String storageKey, long byteSize, String checksumSha256) {
    }

    /** Creates a draft. duration_ms is the contributor's declared length until a transcode measures it. */
    public record Request(
        @NotBlank @Pattern(regexp = "song|sermon|podcast") String mediaType,
        @NotBlank String title,
        @NotNull UUID artistId,
        UUID albumId,
        @Min(1) int durationMs,
        String coverUrl,
        String genre,
        String language,
        String region,
        @Min(0) @Max(100) Integer popularity,
        UUID licenseId
    ) {
    }

    /** Partial update of metadata. Status is changed through its own operations, never here. */
    public record Update(
        String title,
        UUID albumId,
        @Min(1) Integer durationMs,
        String coverUrl,
        String genre,
        String language,
        String region,
        @Min(0) @Max(100) Integer popularity,
        UUID licenseId
    ) {
    }

    /**
     * Where the lossless master was uploaded (masters/{id}/original.{ext}). The upload itself is
     * a presigned PUT to object storage, owned by workstream D; this records the key and asks
     * for the transcode.
     */
    public record TranscodeRequest(@NotBlank String masterStorageKey) {
    }
}
