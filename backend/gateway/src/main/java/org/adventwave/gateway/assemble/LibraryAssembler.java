package org.adventwave.gateway.assemble;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.LibraryDto;
import org.adventwave.contracts.api.LibraryDto.HistoryEntry;
import org.adventwave.platform.library.LibrarySnapshot;
import org.adventwave.platform.library.LibrarySnapshot.HistoryRow;
import org.springframework.stereotype.Component;

@Component
public class LibraryAssembler {
    private final CatalogService catalog;
    private final PlaylistAssembler playlists;

    public LibraryAssembler(CatalogService catalog, PlaylistAssembler playlists) {
        this.catalog = catalog;
        this.playlists = playlists;
    }

    public LibraryDto assemble(LibrarySnapshot snapshot) {
        Map<UUID, String> map = this.catalog.artistNamesById(snapshot.followedArtistIds());
        return new LibraryDto(
            this.toStrings(snapshot.likedSongIds()),
            this.toStrings(snapshot.savedSermonIds()),
            snapshot.userPlaylists().stream().map(this.playlists::summarise).toList(),
            snapshot.followedArtistIds().stream().map(map::get).filter(Objects::nonNull).toList(),
            this.toStrings(snapshot.followedArtistIds()),
            this.toStrings(snapshot.followedPlaylistIds()),
            snapshot.recentHistory().stream().map(row -> new HistoryEntry(row.mediaItemId().toString(), row.playedAtEpochMs())).toList(),
            snapshot.recentHistory().stream().map(row -> row.mediaItemId().toString()).toList()
        );
    }

    private List<String> toStrings(List<UUID> ids) {
        return ids.stream().map(UUID::toString).toList();
    }
}
