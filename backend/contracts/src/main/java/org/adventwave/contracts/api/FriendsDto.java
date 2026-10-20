package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/friends} (RFC 0007): everyone the caller follows, those with
 * something to show first, newest first, then the rest by name. {@code tracks} resolves the items
 * so the client needs no second call, as in {@link HistoryDto}.
 */
public record FriendsDto(List<Friend> friends, List<TrackDto> tracks) {
    /** {@code activity} is absent for anyone who has played nothing lately, is in a private session or does not share. */
    public record Friend(String id, String displayName, Activity activity) {
    }

    /**
     * The last item played. {@code playing} is true from its start until it ends, and no longer
     * than its duration after it started, so a closed tab does not stay "playing" for ever.
     */
    public record Activity(String mediaItemId, boolean playing, long atEpochMs) {
    }
}
