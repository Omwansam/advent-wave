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
    SearchResultsDto.TopResult topResult
) {
    public static SearchResultsDto empty() {
        return new SearchResultsDto(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null);
    }

    public record TopResult(String type, Object item, int score) {
    }
}
