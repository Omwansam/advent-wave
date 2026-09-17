package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminAlbumDto;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * The catalogue's ingest surface: artists, albums, and media items through their lifecycle
 * (draft → processing → published → withdrawn). Requires the {@code catalog:write} scope.
 */
@RestController
@RequestMapping("/v1/admin")
public class CatalogAdminController {
    private final CatalogAdminService admin;

    public CatalogAdminController(CatalogAdminService admin) {
        this.admin = admin;
    }

    // ----------------------------------------------------------------- artists

    @GetMapping("/artists")
    public List<AdminArtistDto> listArtists() {
        return this.admin.listArtists();
    }

    @PostMapping("/artists")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminArtistDto createArtist(@Valid @RequestBody AdminArtistDto.Request request) {
        return this.admin.createArtist(request);
    }

    @GetMapping("/artists/{id}")
    public AdminArtistDto artist(@PathVariable UUID id) {
        return this.admin.artist(id);
    }

    @PutMapping("/artists/{id}")
    public AdminArtistDto updateArtist(@PathVariable UUID id, @Valid @RequestBody AdminArtistDto.Request request) {
        return this.admin.updateArtist(id, request);
    }

    // ----------------------------------------------------------------- albums

    @PostMapping("/albums")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminAlbumDto createAlbum(@Valid @RequestBody AdminAlbumDto.Request request) {
        return this.admin.createAlbum(request);
    }

    @GetMapping("/albums/{id}")
    public AdminAlbumDto album(@PathVariable UUID id) {
        return this.admin.album(id);
    }

    @PatchMapping("/albums/{id}")
    public AdminAlbumDto updateAlbum(@PathVariable UUID id, @Valid @RequestBody AdminAlbumDto.Update request) {
        return this.admin.updateAlbum(id, request);
    }

    // ----------------------------------------------------------------- media items

    /** Any status. {@code status} filters; {@code limit} caps at 500. Newest-updated first. */
    @GetMapping("/media")
    public List<AdminMediaItemDto> listMedia(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "100") int limit
    ) {
        return this.admin.listMedia(status, limit);
    }

    @PostMapping("/media")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminMediaItemDto createMedia(@Valid @RequestBody AdminMediaItemDto.Request request) {
        return this.admin.createMedia(request);
    }

    @GetMapping("/media/{id}")
    public AdminMediaItemDto media(@PathVariable UUID id) {
        return this.admin.media(id);
    }

    @PatchMapping("/media/{id}")
    public AdminMediaItemDto updateMedia(@PathVariable UUID id, @Valid @RequestBody AdminMediaItemDto.Update request) {
        return this.admin.updateMedia(id, request);
    }

    /** draft | failed → processing; emits {@code audio.transcode.v1} requested. */
    @PostMapping("/media/{id}/transcode")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AdminMediaItemDto requestTranscode(@PathVariable UUID id, @Valid @RequestBody AdminMediaItemDto.TranscodeRequest request) {
        return this.admin.requestTranscode(id, request);
    }

    /** → published, if there is something to play and the licence is granted. The database has the last word. */
    @PostMapping("/media/{id}/publish")
    public AdminMediaItemDto publish(@PathVariable UUID id) {
        return this.admin.publish(id);
    }

    /** published → withdrawn. Assets and master stay; the item leaves every listener-facing surface. */
    @PostMapping("/media/{id}/withdraw")
    public AdminMediaItemDto withdraw(@PathVariable UUID id) {
        return this.admin.withdraw(id);
    }
}
