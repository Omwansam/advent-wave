package org.adventwave.reco;

import java.util.List;

public record TasteProfile(List<String> likedSongIds, List<String> recentTrackIds, List<String> followedArtistNames) {
    public static TasteProfile empty() {
        return new TasteProfile(List.of(), List.of(), List.of());
    }

    public TasteProfile(List<String> likedSongIds, List<String> recentTrackIds, List<String> followedArtistNames) {
        likedSongIds = likedSongIds == null ? List.of() : likedSongIds;
        recentTrackIds = recentTrackIds == null ? List.of() : recentTrackIds;
        followedArtistNames = followedArtistNames == null ? List.of() : followedArtistNames;
        this.likedSongIds = likedSongIds;
        this.recentTrackIds = recentTrackIds;
        this.followedArtistNames = followedArtistNames;
    }

    public boolean isColdStart() {
        return this.likedSongIds.isEmpty() && this.recentTrackIds.isEmpty() && this.followedArtistNames.isEmpty();
    }
}
