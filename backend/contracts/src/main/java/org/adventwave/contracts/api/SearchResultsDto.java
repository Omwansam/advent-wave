package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record SearchResultsDto(
    List<TrackDto> songs,
    List<TrackDto> sermons,
    List<TrackDto> podcasts,
    List<ArtistDto> artists,
    List<AlbumDto> albums,
    List<PlaylistDto> playlists,
    SearchResultsDto.TopResult topResult,
    // Songs found by their words, not already in `songs` (RFC 0004). Absent when there are none.
    List<LyricsMatchDto> lyricsMatches
) {
    public static SearchResultsDto empty() {
        return new SearchResultsDto(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null, null);
    }

    public record TopResult(String type, Object item, int score) {
    }
}
