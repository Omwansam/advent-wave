package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/autoplay} (RFC 0004): what to play when the queue runs out, most
 * like the seeds first, all of the first seed's media type, the seeds themselves excluded.
 */
public record AutoplayDto(List<TrackDto> tracks) {
}
