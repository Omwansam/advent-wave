package org.adventwave.contracts.api;

import java.util.List;

/** Response for {@code GET /v1/users?q=} (RFC 0007): exact names first, then prefixes, then the rest. */
public record UserSearchDto(List<UserSummaryDto> users) {
}
