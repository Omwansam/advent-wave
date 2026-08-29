package org.adventwave.gateway.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.LibraryDto;
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
    public Map<String, Boolean> toggleLike(AuthenticatedUser caller, @PathVariable UUID mediaItemId) {
        MediaType mediatype = ((MediaItem)this.catalog
                .entity(mediaItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "media item " + mediaItemId + " not found")))
            .getMediaType();
        String s = mediatype == MediaType.SERMON ? "saved_sermons" : "liked_songs";
        return Map.of("liked", this.library.toggleLike(caller.id(), mediaItemId, s));
    }

    @PutMapping({"/library/follows/artist/{artistId}"})
    public Map<String, Boolean> toggleFollowArtist(AuthenticatedUser caller, @PathVariable UUID artistId) {
        return Map.of("following", this.library.toggleFollowArtist(caller.id(), artistId));
    }

    @PutMapping({"/library/follows/playlist/{playlistId}"})
    public Map<String, Boolean> toggleFollowPlaylist(AuthenticatedUser caller, @PathVariable UUID playlistId) {
        return Map.of("following", this.library.toggleFollowPlaylist(caller.id(), playlistId));
    }

    @GetMapping({"/history"})
    public Map<String, Object> history(AuthenticatedUser caller) {
        List<HistoryRow> list = this.history.recent(caller.id(), 100);
        List<TrackDto> list1 = this.catalog.tracks(list.stream().map(HistoryRow::mediaItemId).toList());
        return Map.of("entries", list.stream().map(row -> Map.of("id", row.mediaItemId().toString(), "ts", row.playedAtEpochMs())).toList(), "tracks", list1);
    }

    @DeleteMapping({"/history"})
    public ResponseEntity<Void> clearHistory(AuthenticatedUser caller) {
        this.history.clear(caller.id());
        return ResponseEntity.noContent().build();
    }
}
