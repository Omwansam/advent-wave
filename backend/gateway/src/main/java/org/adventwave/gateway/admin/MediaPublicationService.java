package org.adventwave.gateway.admin;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.events.Topics;
import org.adventwave.platform.outbox.OutboxWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The two writes that move an item toward 'published', each in its own committed transaction.
 *
 * <p>They are separate on purpose, and callers must not hold an update on the same
 * media_items row while calling either. {@link #publish} updates that row; if the caller's
 * transaction has already updated it and not committed, the nested transaction blocks on the
 * row lock the caller holds, and the caller is waiting for the nested call — a wait Postgres
 * cannot see and will never break. Store outputs, commit, then publish.
 *
 * <p>{@link #publish} is also where the database's licence trigger fires. A refusal rolls back
 * only this transaction and surfaces as {@link DataIntegrityViolationException}; the caller's
 * own state survives. It is not swallowed here because a failed flush leaves the persistence
 * context unusable — the transaction must end, and this is it.
 */
@Service
public class MediaPublicationService {
    private static final Logger log = LoggerFactory.getLogger(MediaPublicationService.class);

    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final CatalogRepositories.MediaAssetRepository assets;
    private final OutboxWriter outbox;

    public MediaPublicationService(
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.MediaAssetRepository assets,
        OutboxWriter outbox
    ) {
        this.mediaItems = mediaItems;
        this.assets = assets;
        this.outbox = outbox;
    }

    /**
     * Records a worker's outputs from an {@code audio.transcode.v1} completed message: the
     * media_assets rows, measured duration and loudness, and the review flags. Replaces the item's
     * asset set — deterministic keys make a re-run overwrite identically (plan §11.5) — and clears
     * any earlier failure reason. Does not publish.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void storeTranscodeOutputs(UUID mediaItemId, JsonNode completed) {
        MediaItem item = this.mediaItems.findAnyStatus(mediaItemId)
            .orElseThrow(() -> new IllegalArgumentException("unknown media item " + mediaItemId));
        this.assets.deleteByMediaItemId(mediaItemId);
        for (JsonNode a : completed.path("assets")) {
            MediaAsset asset = new MediaAsset();
            asset.setMediaItemId(mediaItemId);
            asset.setProfile(a.path("profile").asText());
            asset.setCodec(a.path("codec").asText());
            asset.setBitrateKbps((short) a.path("bitrate_kbps").asInt());
            asset.setContainer(a.path("container").asText("m4a"));
            asset.setSampleRateHz(a.path("sample_rate_hz").asInt());
            asset.setChannels((short) a.path("channels").asInt());
            asset.setStorageKey(a.path("storage_key").asText());
            asset.setByteSize(a.path("byte_size").asLong());
            asset.setChecksumSha256(a.path("checksum_sha256").asText());
            this.assets.save(asset);
        }
        item.setDurationMs(completed.path("duration_ms").asInt(item.getDurationMs()));
        if (completed.hasNonNull("loudness_lufs")) item.setLoudnessLufs(BigDecimal.valueOf(completed.path("loudness_lufs").asDouble()));
        if (completed.hasNonNull("true_peak_dbfs")) item.setTruePeakDbfs(BigDecimal.valueOf(completed.path("true_peak_dbfs").asDouble()));
        List<String> flags = new ArrayList<>();
        completed.path("flags").forEach(f -> flags.add(f.asText()));
        item.setReviewFlags(flags);
        item.setFailureReason(null);
        item.setUpdatedAt(Instant.now());
        this.mediaItems.saveAndFlush(item);
    }

    /**
     * Marks a transcode as failed and records why, for the admin portal. Does not touch assets
     * from any earlier success.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID mediaItemId, String reason) {
        MediaItem item = this.mediaItems.findAnyStatus(mediaItemId)
            .orElseThrow(() -> new IllegalArgumentException("unknown media item " + mediaItemId));
        item.setStatus("failed");
        item.setFailureReason(reason);
        item.setUpdatedAt(Instant.now());
        this.mediaItems.saveAndFlush(item);
        log.warn("transcode failed for {}: {}", mediaItemId, reason);
        this.outbox.append("media_item", mediaItemId, Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(item));
    }

    /**
     * Publishes and returns the published item, or throws {@link DataIntegrityViolationException}
     * when the database refuses (no licence, licence not granted, or expired).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MediaItem publish(UUID mediaItemId) {
        MediaItem item = this.mediaItems.findAnyStatus(mediaItemId)
            .orElseThrow(() -> new IllegalArgumentException("unknown media item " + mediaItemId));
        try {
            item.setStatus("published");
            item.setPublishedAt(Instant.now());
            item.setUpdatedAt(Instant.now());
            item = this.mediaItems.saveAndFlush(item);   // flush now, so the trigger fires inside this try
        } catch (DataIntegrityViolationException e) {
            log.warn("publication refused for media item {}: {}", mediaItemId,
                e.getMostSpecificCause().getMessage().lines().findFirst().orElse(""));
            throw e;   // rolls this transaction back — and only this one
        }
        this.outbox.append("media_item", mediaItemId, Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(item));
        return item;
    }
}
