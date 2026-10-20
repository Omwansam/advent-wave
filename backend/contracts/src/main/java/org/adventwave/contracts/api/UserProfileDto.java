package org.adventwave.contracts.api;

/**
 * Response for {@code GET /v1/users/{id}} (RFC 0007): a listener's public profile. No playlists
 * yet: every playlist is public by default only because the column predates any way to choose,
 * so none is shown until a listener can.
 */
public record UserProfileDto(
    String id,
    String displayName,
    long followerCount,
    long followingCount,
    boolean followedByMe,
    boolean followsMe,
    boolean isMe
) {
}
