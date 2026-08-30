package org.adventwave.contracts.api;

import java.util.List;

/** Response for {@code GET /v1/browse} — the whole catalogue, split by media type. */
public record BrowseDto(
    List<TrackDto> songs,
    List<TrackDto> sermons,
    List<TrackDto> podcasts,
    List<DiscoverCategoryDto> categories
) {
}
