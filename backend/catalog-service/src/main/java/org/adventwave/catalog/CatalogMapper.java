package org.adventwave.catalog;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.TrackDto;

public final class CatalogMapper {
    private CatalogMapper() {
    }

    public static TrackDto toTrack(MediaItem item, String apiBaseUrl) {
        Album album = item.getAlbum();
        Artist artist = item.getArtist();
        return new TrackDto(
            item.getId().toString(),
            item.getTitle(),
            artist.getName(),
            album == null ? null : album.getTitle(),
            TrackDto.toSeconds(item.getDurationMs()),
            item.getCoverUrl(),
            streamUrl(apiBaseUrl, item.getId()),
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

    public static List<TrackDto> toTracks(List<MediaItem> items, String apiBaseUrl) {
        return items.stream().map(item -> toTrack(item, apiBaseUrl)).toList();
    }

    public static ArtistDto toArtist(Artist artist, List<String> songIds, List<TrackDto> tracks) {
        return new ArtistDto(artist.getId().toString(), artist.getName(), artist.getSlug(), artist.getCoverUrl(), artist.isVerified(), songIds, tracks);
    }

    public static AlbumDto toAlbum(Album album, List<String> songIds, List<TrackDto> tracks) {
        return new AlbumDto(
            album.getId().toString(), album.getTitle(), album.getArtist().getName(), album.getArtist().getId().toString(), album.getCoverUrl(), songIds, tracks
        );
    }

    private static String streamUrl(String apiBaseUrl, UUID mediaItemId) {
        return apiBaseUrl + "/v1/media/" + mediaItemId + "/stream";
    }
}
