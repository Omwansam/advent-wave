package org.adventwave.gateway.admin;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.Church;
import org.adventwave.catalog.domain.License;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.admin.AdminAlbumDto;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;

public final class AdminMapper {
    private AdminMapper() {
    }

    static ChurchDto church(Church c) {
        return new ChurchDto(c.getId().toString(), c.getName(), c.getCountry(), c.getRegion(), c.getContactEmail(), c.getConsentStatus(), c.getCreatedAt().toString());
    }

    static LicenseDto license(License l) {
        return new LicenseDto(
            l.getId().toString(), l.getChurchId().toString(), l.getConsentStatus(), l.getConsentDocumentUrl(), l.getTerritory(),
            l.getGrantedAt() == null ? null : l.getGrantedAt().toString(),
            l.getExpiresAt() == null ? null : l.getExpiresAt().toString(),
            l.getRevenueSharePct(), l.getCreatedAt().toString()
        );
    }

    static AdminArtistDto artist(Artist a) {
        return new AdminArtistDto(
            a.getId().toString(), a.getName(), a.getSlug(), a.getCoverUrl(), a.getBio(),
            a.getChurchId() == null ? null : a.getChurchId().toString(), a.isVerified(), a.getCreatedAt().toString()
        );
    }

    static AdminAlbumDto album(Album al) {
        return new AdminAlbumDto(
            al.getId().toString(), al.getTitle(), al.getArtist().getId().toString(), al.getCoverUrl(),
            al.getReleaseDate() == null ? null : al.getReleaseDate().toString(), al.getCreatedAt().toString()
        );
    }

    static AdminMediaItemDto media(MediaItem m, List<MediaAsset> assets) {
        return new AdminMediaItemDto(
            m.getId().toString(), m.getMediaType().wireValue(), m.getTitle(), m.getArtist().getId().toString(),
            m.getAlbum() == null ? null : m.getAlbum().getId().toString(),
            m.getDurationMs(), m.getCoverUrl(), m.getGenre(), m.getLanguage(), m.getRegion(), m.getPopularity(), m.getStatus(),
            m.getLicenseId() == null ? null : m.getLicenseId().toString(),
            m.getMasterStorageKey(),
            m.getLoudnessLufs() == null ? null : m.getLoudnessLufs().doubleValue(),
            m.getTruePeakDbfs() == null ? null : m.getTruePeakDbfs().doubleValue(),
            m.getPublishedAt() == null ? null : m.getPublishedAt().toString(),
            m.getCreatedAt().toString(), m.getUpdatedAt().toString(),
            assets.stream().map(a -> new AdminMediaItemDto.Asset(
                a.getProfile(), a.getCodec(), a.getBitrateKbps(), a.getContainer(), a.getSampleRateHz(), a.getChannels(),
                a.getStorageKey(), a.getByteSize(), a.getChecksumSha256())).toList(),
            List.copyOf(m.getReviewFlags()),
            m.getFailureReason()
        );
    }

    // ----------------------------------------------------------------- Kafka payloads
    // Shaped by contracts/kafka/<topic>/schema.json. The schemas forbid nulls (each field has a
    // single type) and additional properties, so optional fields are omitted, never null.

    static Map<String, Object> artistEvent(Artist a) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("artist_id", a.getId().toString());
        p.put("name", a.getName());
        p.put("slug", a.getSlug());
        putIfPresent(p, "cover_url", a.getCoverUrl());
        putIfPresent(p, "bio", a.getBio());
        putIfPresent(p, "church_id", a.getChurchId() == null ? null : a.getChurchId().toString());
        p.put("verified", a.isVerified());
        return p;
    }

    public static Map<String, Object> mediaEvent(MediaItem m) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("media_item_id", m.getId().toString());
        p.put("media_type", m.getMediaType().wireValue());
        p.put("title", m.getTitle());
        p.put("artist_id", m.getArtist().getId().toString());
        putIfPresent(p, "album_id", m.getAlbum() == null ? null : m.getAlbum().getId().toString());
        p.put("duration_ms", m.getDurationMs());
        putIfPresent(p, "cover_url", m.getCoverUrl());
        putIfPresent(p, "genre", m.getGenre());
        putIfPresent(p, "language", m.getLanguage());
        putIfPresent(p, "region", m.getRegion());
        p.put("popularity", (int) m.getPopularity());
        p.put("status", m.getStatus());
        putIfPresent(p, "published_at", m.getPublishedAt() == null ? null : m.getPublishedAt().toString());
        p.put("updated_at", m.getUpdatedAt().toString());
        return p;
    }

    static Map<String, Object> transcodeRequested(UUID eventId, MediaItem m, String ladder, int attempt, String requestedAt) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("kind", "requested");
        p.put("event_id", eventId.toString());
        p.put("media_item_id", m.getId().toString());
        p.put("media_type", m.getMediaType().wireValue());
        p.put("master_storage_key", m.getMasterStorageKey());
        p.put("ladder", ladder);
        p.put("attempt", attempt);
        p.put("requested_at", requestedAt);
        return p;
    }

    private static void putIfPresent(Map<String, Object> p, String key, String value) {
        if (value != null && !value.isBlank()) p.put(key, value);
    }
}
