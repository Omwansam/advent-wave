package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record HomeDto(
    String greetingPeriod,
    List<TrackDto> recentlyPlayed,
    List<TrackDto> trendingNow,
    List<PlaylistDto> sabbathWorship,
    List<TrackDto> sermons,
    RecommendationsDto recommendations
) {
}
