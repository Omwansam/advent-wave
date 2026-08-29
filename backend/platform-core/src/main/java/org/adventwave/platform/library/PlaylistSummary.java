package org.adventwave.platform.library;

import java.util.List;
import java.util.UUID;
import org.adventwave.platform.domain.Playlist;

public record PlaylistSummary(UUID id, UUID ownerId, String title, String description, String coverUrl, boolean curated, String legacyId, List<UUID> songIds) {
    public static PlaylistSummary of(Playlist playlist, List<UUID> songIds) {
        return new PlaylistSummary(
            playlist.getId(),
            playlist.getOwnerId(),
            playlist.getTitle(),
            playlist.getDescription(),
            playlist.getCoverUrl(),
            playlist.isCurated(),
            playlist.getLegacyId(),
            songIds
        );
    }
}
