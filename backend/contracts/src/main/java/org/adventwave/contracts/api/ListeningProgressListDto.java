package org.adventwave.contracts.api;

import java.util.List;

/** Response for {@code GET /v1/progress}: the caller's resume points, most recently updated first. */
public record ListeningProgressListDto(List<ListeningProgressDto> items) {
}
