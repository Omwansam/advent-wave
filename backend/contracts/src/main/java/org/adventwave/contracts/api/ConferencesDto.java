package org.adventwave.contracts.api;

import java.util.List;

/** Response for {@code GET /v1/conferences}: the union conferences, each with its conferences and fields (RFC 0009). */
public record ConferencesDto(List<ConferenceDto> unions) {
}
