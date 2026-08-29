package org.adventwave.platform.library;

import java.util.List;
import java.util.UUID;

public record LibrarySnapshot(
    List<UUID> likedSongIds,
    List<UUID> savedSermonIds,
    List<PlaylistSummary> userPlaylists,
    List<UUID> followedArtistIds,
    List<UUID> followedPlaylistIds,
    List<LibrarySnapshot.HistoryRow> recentHistory
) {
    public record HistoryRow(UUID mediaItemId, long playedAtEpochMs) {
    }
}
