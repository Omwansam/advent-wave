package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.Instant;
import java.util.List;

/**
 * Response for {@code GET /v1/site} (RFC 0008): what the public website shows about the
 * catalogue, to anyone, without an account. Titles, names and covers only — never a stream URL,
 * never anything about a listener.
 */
@JsonInclude(Include.NON_NULL)
public record SiteDto(
    SiteTotals totals,
    List<SiteItem> trending,
    List<SiteItem> sermons,
    List<SiteCollection> playlists,
    List<DiscoverCategoryDto> categories,
    Instant generatedAt
) {
    /** Published items only; {@code hours} rounds the published audio's total duration down. */
    public record SiteTotals(long songs, long sermons, long podcasts, long hours, long artists, long churches, long playlists) {
    }

    public record SiteItem(String id, String title, String artist, String artistId, String albumId, String cover, MediaType mediaType, int durationMs) {
        public static SiteItem of(TrackDto track) {
            return new SiteItem(track.id(), track.title(), track.artist(), track.artistId(), track.albumId(), track.cover(), track.mediaType(), track.durationMs());
        }
    }

    /** A curated playlist; {@code items} is how many recordings it holds. Without its own cover, its first recording's. */
    public record SiteCollection(String id, String title, String description, String cover, int items) {
        public static SiteCollection of(PlaylistDto playlist) {
            String cover = playlist.cover();
            if (cover == null && playlist.songs() != null && !playlist.songs().isEmpty()) {
                cover = playlist.songs().get(0).cover();
            }

            return new SiteCollection(playlist.id(), playlist.title(), playlist.description(), cover, playlist.songIds() == null ? 0 : playlist.songIds().size());
        }
    }
}
