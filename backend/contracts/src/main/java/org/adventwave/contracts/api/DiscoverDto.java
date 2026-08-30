package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/discover}. Typed rather than a bare map so the generated
 * OpenAPI document carries a real schema for the client (plan §1 day 4).
 */
public record DiscoverDto(List<DiscoverCategoryDto> categories, List<TrackDto> tracks) {
}
