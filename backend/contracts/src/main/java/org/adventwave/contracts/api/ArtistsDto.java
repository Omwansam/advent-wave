package org.adventwave.contracts.api;

import java.util.List;

/** Response for {@code GET /v1/artists}: profiles, the most listened to in the last 30 days first (RFC 0009). */
public record ArtistsDto(List<ArtistSummaryDto> artists) {
}
