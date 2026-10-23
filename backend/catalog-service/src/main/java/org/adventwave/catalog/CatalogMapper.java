package org.adventwave.catalog;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.ArtistSummaryDto;
import org.adventwave.contracts.api.TrackDto;

public final class CatalogMapper {
    private CatalogMapper() {
    }

    /** An item without its own cover shows its album's, and without that its profile's (RFC 0009). */
    public static TrackDto toTrack(MediaItem item, CatalogProperties properties) {
        Album album = item.getAlbum();
        Artist artist = item.getArtist();
        return new TrackDto(
            item.getId().toString(),
            item.getTitle(),
            artist.getName(),
            album == null ? null : album.getTitle(),
            TrackDto.toSeconds(item.getDurationMs()),
            cover(item.getCoverUrl(), album, artist, properties),
            streamUrl(properties.getApiBaseUrl(), item.getId()),
            item.getMediaType(),
            artist.getId().toString(),
            album == null ? null : album.getId().toString(),
            item.getDurationMs(),
            item.getGenre(),
            item.getLanguage(),
            item.getRegion(),
            item.getPopularity(),
            item.getLegacyId()
        );
    }

    public static List<TrackDto> toTracks(List<MediaItem> items, CatalogProperties properties) {
        return items.stream().map(item -> toTrack(item, properties)).toList();
    }

    /** The parts of a profile that need nothing but its own row: what search and cards show. */
    public static ArtistDto toArtist(Artist artist, List<String> songIds, List<TrackDto> tracks, CatalogProperties properties) {
        return new ArtistDto(
            artist.getId().toString(),
            artist.getName(),
            artist.getSlug(),
            Covers.artist(artist, properties.getCoverBaseUrl()),
            artist.isVerified(),
            songIds,
            tracks,
            artist.getKind(),
            artist.getEnsemble(),
            null,
            artist.getLocation(),
            null,
            null,
            null,
            null,
            null
        );
    }

    /** A profile on a card; {@code home} is its home church's profile, or null. */
    public static ArtistSummaryDto toSummary(Artist artist, Artist home, CatalogProperties properties) {
        return new ArtistSummaryDto(
            artist.getId().toString(),
            artist.getName(),
            Covers.artist(artist, properties.getCoverBaseUrl()),
            artist.getKind(),
            artist.getEnsemble(),
            artist.isVerified(),
            home == null ? null : home.getId().toString(),
            home == null ? null : home.getName(),
            artist.getLocation()
        );
    }

    public static AlbumDto toAlbum(Album album, List<String> songIds, List<TrackDto> tracks, CatalogProperties properties) {
        return new AlbumDto(
            album.getId().toString(),
            album.getTitle(),
            album.getArtist().getName(),
            album.getArtist().getId().toString(),
            cover(null, album, album.getArtist(), properties),
            songIds,
            tracks
        );
    }

    private static String cover(String own, Album album, Artist artist, CatalogProperties properties) {
        String base = properties.getCoverBaseUrl();
        if (own != null && !own.isBlank()) {
            return Covers.absolute(own, base);
        }

        if (album != null && album.getCoverUrl() != null && !album.getCoverUrl().isBlank()) {
            return Covers.absolute(album.getCoverUrl(), base);
        }

        return Covers.artist(artist, base);
    }

    private static String streamUrl(String apiBaseUrl, UUID mediaItemId) {
        return apiBaseUrl + "/v1/media/" + mediaItemId + "/stream";
    }
}
