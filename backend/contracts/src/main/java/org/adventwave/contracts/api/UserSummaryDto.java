package org.adventwave.contracts.api;

/**
 * Another listener as search shows them (RFC 0007). A display name only: an email never leaves
 * the account it belongs to.
 */
public record UserSummaryDto(String id, String displayName, boolean followedByMe) {
}
