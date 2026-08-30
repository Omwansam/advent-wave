package org.adventwave.contracts.api;

/** Response for {@code PUT /v1/library/likes/{id}} — the state after the toggle. */
public record LikeResultDto(boolean liked) {
}
