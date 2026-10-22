package org.adventwave.catalog.media;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.StreamManifestDto;
import org.adventwave.contracts.api.StreamManifestDto.Profile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(
    readOnly = true
)
public class StreamService {
    private static final Logger log = LoggerFactory.getLogger(StreamService.class);
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final CatalogRepositories.MediaAssetRepository assets;
    /** Beyond the recording's length: pauses, a slow start, a seek back near the end. */
    private static final Duration PLAYBACK_MARGIN = Duration.ofMinutes(30);
    private final SignedUrlMinter minter;
    private final CatalogProperties properties;
    private final AssetUrls assetUrls;

    public StreamService(
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.MediaAssetRepository assets,
        SignedUrlMinter minter,
        CatalogProperties properties,
        AssetUrls assetUrls
    ) {
        this.mediaItems = mediaItems;
        this.assets = assets;
        this.minter = minter;
        this.properties = properties;
        this.assetUrls = assetUrls;
    }

    public Optional<StreamManifestDto> manifest(UUID mediaItemId, UUID userId, String audioQuality) {
        return this.mediaItems
            .findPublished(mediaItemId)
            .map(
                item -> {
                    List<MediaAsset> list = this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(mediaItemId);
                    String s = this.selectProfile(item, list, audioQuality);
                    SignedUrlMinter.Signed signedurlminter$signed = this.playbackUrl(item, list, s, userId);
                    Double d0 = item.getLoudnessLufs() == null ? null : item.getLoudnessLufs().doubleValue();
                    Double d1 = d0 == null ? null : this.properties.getTargetLufs() - d0;
                    return new StreamManifestDto(
                        mediaItemId.toString(),
                        item.getDurationMs(),
                        d0,
                        this.properties.getTargetLufs(),
                        d1,
                        null,
                        s,
                        signedurlminter$signed.url(),
                        signedurlminter$signed.expiresAtEpochSeconds(),
                        list.stream().map(a -> new Profile(a.getProfile(), a.getBitrateKbps(), a.getByteSize(), a.getCodec())).toList()
                    );
                }
            );
    }

    public Optional<String> resolvePlaybackUrl(UUID mediaItemId, String profile, String audioQuality) {
        return this.mediaItems.findPublished(mediaItemId).map(item -> {
            List<MediaAsset> list = this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(mediaItemId);
            String s = "auto".equals(profile) ? this.selectProfile(item, list, audioQuality) : profile;
            return list.stream().filter(a -> a.getProfile().equals(s)).findFirst()
                .map(a -> this.storageUrl(a, item))
                .orElseGet(() -> this.fallbackUrl(item));
        });
    }

    /**
     * What the player loads. With signed storage URLs (object storage, RFC 0006) that is the asset's
     * own presigned URL: the player goes straight to the bucket instead of through the gateway's
     * redirect, one round trip fewer before the first sound. Otherwise, and for an item with no
     * asset in that profile, the gateway's signed redirect, which checks the signature first.
     */
    private SignedUrlMinter.Signed playbackUrl(MediaItem item, List<MediaAsset> assets, String profile, UUID userId) {
        if (this.assetUrls.signed()) {
            Optional<MediaAsset> asset = assets.stream().filter(a -> a.getProfile().equals(profile)).findFirst();
            if (asset.isPresent()) {
                Duration validFor = this.validFor(item);
                long expiresAt = Instant.now().plus(validFor).getEpochSecond();
                return new SignedUrlMinter.Signed(this.assetUrls.url(asset.get().getStorageKey(), validFor), expiresAt);
            }
        }
        return this.minter.mint(item.getId(), profile, userId, this.properties.getSignedUrlTtl());
    }

    private String selectProfile(MediaItem item, List<MediaAsset> available, String audioQuality) {
        String s = BitrateLadder.resolveProfile(item.getMediaType(), audioQuality);
        return available.stream().anyMatch(a -> a.getProfile().equals(s)) ? s : available.stream().map(MediaAsset::getProfile).findFirst().orElse(s);
    }

    /**
     * The asset's own URL, valid for longer than the recording (RFC 0006): the player keeps making
     * range requests to it for as long as it plays, and a 45-minute sermon must not 403 at minute 6.
     * Never shorter than the playback redirect that leads here.
     */
    private String storageUrl(MediaAsset asset, MediaItem item) {
        return this.assetUrls.url(asset.getStorageKey(), this.validFor(item));
    }

    private Duration validFor(MediaItem item) {
        Duration validFor = Duration.ofMillis(Math.max(0, item.getDurationMs())).plus(PLAYBACK_MARGIN);
        return validFor.compareTo(this.properties.getSignedUrlTtl()) < 0 ? this.properties.getSignedUrlTtl() : validFor;
    }

    private String fallbackUrl(MediaItem item) {
        if (item.getSeedSourceUrl() == null) {
            throw new IllegalStateException("media item " + item.getId() + " is published but has no playable asset");
        } else {
            log.warn("serving seed placeholder audio for media item {} ({}) — no media_assets rows", item.getId(), item.getTitle());
            return item.getSeedSourceUrl();
        }
    }

    public boolean verifySignature(UUID mediaItemId, String profile, UUID userId, long expiresAt, String signature) {
        return this.minter.verify(mediaItemId, profile, userId, expiresAt, signature);
    }
}
