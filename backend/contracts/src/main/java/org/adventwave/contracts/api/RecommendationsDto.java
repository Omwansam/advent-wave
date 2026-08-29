package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record RecommendationsDto(
    List<TrackDto> recommendedSongs,
    List<PlaylistDto> recommendedPlaylists,
    RecommendationsDto.BecauseYouListened becauseYouListened,
    RecommendationsDto.TrendingInRegion trendingInRegion
) {
    public record BecauseYouListened(String artistName, List<TrackDto> songs) {
    }

    public record TrendingInRegion(String label, String region, List<TrackDto> songs) {
    }
}
