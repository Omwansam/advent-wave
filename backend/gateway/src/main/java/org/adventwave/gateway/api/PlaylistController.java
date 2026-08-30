package org.adventwave.gateway.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.PlaylistsDto;
import org.adventwave.gateway.assemble.PlaylistAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.library.LibraryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1/playlists"})
public class PlaylistController {
    private final LibraryService library;
    private final PlaylistAssembler assembler;

    public PlaylistController(LibraryService library, PlaylistAssembler assembler) {
        this.library = library;
        this.assembler = assembler;
    }

    /**
     * Curated playlists and the caller's own, tracks resolved. resolveAll batches the track
     * lookup across every playlist, so this is one query rather than one per playlist.
     */
    @GetMapping
    public PlaylistsDto list(AuthenticatedUser caller) {
        return new PlaylistsDto(
            this.assembler.resolveAll(this.library.curatedPlaylists()),
            this.assembler.resolveAll(this.library.userPlaylists(caller.id()))
        );
    }

    @GetMapping({"/{id}"})
    public PlaylistDto playlist(@PathVariable UUID id) {
        return this.library
            .playlist(id)
            .map(this.assembler::resolve)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "playlist " + id + " not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlaylistDto create(AuthenticatedUser caller, @RequestBody PlaylistController.CreateRequest request) {
        return this.assembler.resolve(this.library.createPlaylist(caller.id(), request.title(), request.description(), request.cover()));
    }

    @PutMapping({"/{id}/items"})
    public PlaylistDto addItems(AuthenticatedUser caller, @PathVariable UUID id, @Valid @RequestBody PlaylistController.ItemsRequest request) {
        return this.assembler.resolve(this.library.addToPlaylist(caller.id(), id, request.mediaItemIds()));
    }

    @DeleteMapping({"/{id}/items/{mediaItemId}"})
    public PlaylistDto removeItem(AuthenticatedUser caller, @PathVariable UUID id, @PathVariable UUID mediaItemId) {
        return this.assembler.resolve(this.library.removeFromPlaylist(caller.id(), id, mediaItemId));
    }

    @PatchMapping({"/{id}"})
    public PlaylistDto update(AuthenticatedUser caller, @PathVariable UUID id, @RequestBody PlaylistController.UpdateRequest request) {
        return this.assembler.resolve(this.library.updatePlaylist(caller.id(), id, request.title(), request.description()));
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<Void> delete(AuthenticatedUser caller, @PathVariable UUID id) {
        this.library.deletePlaylist(caller.id(), id);
        return ResponseEntity.noContent().build();
    }

    public record CreateRequest(String title, String description, String cover) {
    }

    public record ItemsRequest(@NotEmpty List<UUID> mediaItemIds) {
    }

    public record UpdateRequest(String title, String description) {
    }
}
