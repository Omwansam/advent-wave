package org.adventwave.gateway.api;

import java.util.List;
import java.util.stream.Stream;
import org.adventwave.catalog.search.SearchService;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.SearchResultsDto;
import org.adventwave.gateway.assemble.PlaylistAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.library.LibraryService;
import org.adventwave.platform.library.PlaylistSummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1"})
public class SearchController {
    private final SearchService search;
    private final LibraryService library;
    private final PlaylistAssembler playlists;

    public SearchController(SearchService search, LibraryService library, PlaylistAssembler playlists) {
        this.search = search;
        this.library = library;
        this.playlists = playlists;
    }

    @GetMapping({"/search"})
    public SearchResultsDto search(AuthenticatedUser caller, @RequestParam("q") String query) {
        List<PlaylistDto> list = Stream.<PlaylistSummary>concat(this.library.curatedPlaylists().stream(), this.library.userPlaylists(caller.id()).stream())
            .map(this.playlists::summarise)
            .toList();
        return this.search.search(query, list);
    }
}
