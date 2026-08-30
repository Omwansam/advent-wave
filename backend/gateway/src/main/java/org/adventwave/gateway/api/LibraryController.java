package org.adventwave.gateway.api;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.FollowResultDto;
import org.adventwave.contracts.api.HistoryDto;
import org.adventwave.contracts.api.LibraryDto;
import org.adventwave.contracts.api.LikeResultDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.gateway.assemble.LibraryAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.library.LibraryService;
import org.adventwave.platform.library.ListeningHistoryService;
import org.adventwave.platform.library.LibrarySnapshot.HistoryRow;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1"})
public class LibraryController {
    /** ListeningHistory and useLibraryStore both cap recent history at 100 (plan §1 day 4). */
    private static final int HISTORY_LIMIT = 100;
    private final LibraryService library;
    private final ListeningHistoryService history;
    private final LibraryAssembler assembler;
    private final CatalogService catalog;

    public LibraryController(LibraryService library, ListeningHistoryService history, LibraryAssembler assembler, CatalogService catalog) {
        this.library = library;
        this.history = history;
        this.assembler = assembler;
        this.catalog = catalog;
    }

    @GetMapping({"/library"})
    public LibraryDto library(AuthenticatedUser caller) {
        return this.assembler.assemble(this.library.snapshot(caller.id()));
    }

    @PutMapping({"/library/likes/{mediaItemId}"})
    public LikeResultDto toggleLike(AuthenticatedUser caller, @PathVariable UUID mediaItemId) {
        MediaType mediatype = ((MediaItem)this.catalog
                .entity(mediaItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "media item " + mediaItemId + " not found")))
            .getMediaType();
        String s = mediatype == MediaType.SERMON ? "saved_sermons" : "liked_songs";
        return new LikeResultDto(this.library.toggleLike(caller.id(), mediaItemId, s));
    }

    @PutMapping({"/library/follows/artist/{artistId}"})
    public FollowResultDto toggleFollowArtist(AuthenticatedUser caller, @PathVariable UUID artistId) {
        return new FollowResultDto(this.library.toggleFollowArtist(caller.id(), artistId));
    }

    @PutMapping({"/library/follows/playlist/{playlistId}"})
    public FollowResultDto toggleFollowPlaylist(AuthenticatedUser caller, @PathVariable UUID playlistId) {
        return new FollowResultDto(this.library.toggleFollowPlaylist(caller.id(), playlistId));
    }

    @GetMapping({"/history"})
    public HistoryDto history(AuthenticatedUser caller) {
        List<HistoryRow> rows = this.history.recent(caller.id(), HISTORY_LIMIT);
        List<TrackDto> tracks = this.catalog.tracks(rows.stream().map(HistoryRow::mediaItemId).toList());
        List<LibraryDto.HistoryEntry> entries = rows.stream()
            .map(row -> new LibraryDto.HistoryEntry(row.mediaItemId().toString(), row.playedAtEpochMs()))
            .toList();
        return new HistoryDto(entries, tracks);
    }

    @DeleteMapping({"/history"})
    public ResponseEntity<Void> clearHistory(AuthenticatedUser caller) {
        this.history.clear(caller.id());
        return ResponseEntity.noContent().build();
    }
}
