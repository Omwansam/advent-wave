package org.adventwave.contracts.api;

import java.util.List;

public record LibraryDto(
    List<String> likedSongIds,
    List<String> savedSermonIds,
    List<PlaylistDto> userPlaylists,
    List<String> followedArtistNames,
    List<String> followedArtistIds,
    List<String> followedPlaylistIds,
    List<LibraryDto.HistoryEntry> recentHistory,
    List<String> recentTrackIds
) {
    public record HistoryEntry(String id, long ts) {
    }
}
