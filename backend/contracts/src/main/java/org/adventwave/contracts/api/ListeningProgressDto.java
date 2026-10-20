package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.Min;

/**
 * One resume point in a sermon or podcast episode (RFC 0003). Response of
 * {@code PUT /v1/progress/{mediaItemId}} and a row of {@code GET /v1/progress}; also that PUT's
 * request body, where {@code mediaItemId} and {@code updatedAt} are ignored — the path names the
 * item and the server stamps the time.
 */
@JsonInclude(Include.NON_NULL)
public record ListeningProgressDto(
    String mediaItemId,
    @Min(0L) int positionMs,
    boolean completed,
    String updatedAt
) {
}
