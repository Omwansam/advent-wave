package org.adventwave.contracts.api;

/** Response for the {@code PUT /v1/library/follows/*} toggles — the state after the toggle. */
public record FollowResultDto(boolean following) {
}
