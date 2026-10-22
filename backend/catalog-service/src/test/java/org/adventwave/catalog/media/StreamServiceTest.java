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
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.StreamManifestDto;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class StreamServiceTest {
    private static final int DURATION_MS = 180_000;
    private final CatalogRepositories.MediaItemRepository items = Mockito.mock(CatalogRepositories.MediaItemRepository.class);
    private final CatalogRepositories.MediaAssetRepository assets = Mockito.mock(CatalogRepositories.MediaAssetRepository.class);
    private final CatalogProperties properties = new CatalogProperties();
    private final SignedUrlMinter minter = new SignedUrlMinter.LocalHmacSignedUrlMinter(this.properties);
    private final UUID itemId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    /** Object storage: every URL it gives out is presigned. */
    private final AssetUrls bucket = new AssetUrls() {
        @Override
        public String url(String storageKey, Duration validFor) {
            return "https://derived.bucket.test/" + storageKey + "?X-Amz-Expires=" + validFor.toSeconds() + "&X-Amz-Signature=abc";
        }

        @Override
        public boolean signed() {
            return true;
        }
    };

    /** The local media origin: plain URLs, which only the gateway's redirect may lead to. */
    private final AssetUrls origin = (storageKey, validFor) -> "http://localhost:8080/media-storage/" + storageKey;

    @BeforeEach
    void setUp() {
        MediaItem item = new MediaItem();
        item.setId(this.itemId);
        item.setMediaType(MediaType.SONG);
        item.setDurationMs(DURATION_MS);
        Mockito.when(this.items.findPublished(this.itemId)).thenReturn(Optional.of(item));
        Mockito.when(this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(this.itemId))
            .thenReturn(List.of(this.asset("aac_64", 64), this.asset("aac_96", 96), this.asset("aac_160", 160), this.asset("aac_320", 320)));
    }

    private MediaAsset asset(String profile, int kbps) {
        MediaAsset asset = new MediaAsset();
        asset.setMediaItemId(this.itemId);
        asset.setProfile(profile);
        asset.setBitrateKbps((short) kbps);
        asset.setStorageKey("derived/" + this.itemId + "/" + profile + ".m4a");
        return asset;
    }

    private StreamManifestDto manifest(AssetUrls urls) {
        return new StreamService(this.items, this.assets, this.minter, this.properties, urls)
            .manifest(this.itemId, this.userId, "normal").orElseThrow();
    }

    @Test
    @DisplayName("with object storage the player gets the presigned asset URL itself, valid for the recording plus a margin")
    void signedStorageGoesStraightToTheBucket() {
        StreamManifestDto m = this.manifest(this.bucket);

        Assertions.assertThat(m.audioUrl())
            .startsWith("https://derived.bucket.test/derived/" + this.itemId + "/" + m.selectedProfile() + ".m4a")
            .contains("X-Amz-Signature=");
        long expected = Instant.now().plusMillis(DURATION_MS).plus(Duration.ofMinutes(30)).getEpochSecond();
        Assertions.assertThat(m.expiresAtEpochSeconds()).isBetween(expected - 5, expected + 5);
    }

    @Test
    @DisplayName("with an unsigned origin the player still gets the gateway's signed redirect, never the plain URL")
    void unsignedOriginStaysBehindTheRedirect() {
        StreamManifestDto m = this.manifest(this.origin);

        Assertions.assertThat(m.audioUrl())
            .startsWith(this.properties.getApiBaseUrl() + "/v1/media/" + this.itemId + "/stream/" + m.selectedProfile() + "?")
            .contains("sig=")
            .doesNotContain("media-storage");
        long expected = Instant.now().plus(this.properties.getSignedUrlTtl()).getEpochSecond();
        Assertions.assertThat(m.expiresAtEpochSeconds()).isBetween(expected - 5, expected + 5);
    }

    @Test
    @DisplayName("an item with no stored asset keeps the redirect, which knows how to fall back")
    void noAssetKeepsTheRedirect() {
        Mockito.when(this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(this.itemId)).thenReturn(List.of());

        Assertions.assertThat(this.manifest(this.bucket).audioUrl()).contains("/v1/media/" + this.itemId + "/stream/");
    }
}
