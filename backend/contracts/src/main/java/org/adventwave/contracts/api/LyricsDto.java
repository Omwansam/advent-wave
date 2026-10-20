package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

/**
 * Response for {@code GET /v1/media/{id}/lyrics} and the admin lyrics operations (RFC 0004).
 * {@code synced} is true when every line has a {@code startMs}. {@code credit} must be shown
 * with the words; {@code rightsBasis} is why they may be shown at all.
 */
@JsonInclude(Include.NON_NULL)
public record LyricsDto(
    String mediaItemId,
    boolean synced,
    List<LyricLineDto> lines,
    String language,
    String rightsBasis,
    String credit,
    String updatedAt
) {
}
