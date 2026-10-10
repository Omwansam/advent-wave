package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminAlbumDto;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.MasterUploadDto;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.adventwave.gateway.admin.MasterUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * The catalogue's ingest surface: artists, albums, and media items through their lifecycle
 * (draft → processing → published → withdrawn). Each operation needs its permission: reading
 * {@code catalog:read}; editing, uploads and transcodes {@code media:write}; publish and withdraw
 * {@code media:publish} (AdminAccessRules).
 */
@RestController
@RequestMapping("/v1/admin")
public class CatalogAdminController {
    private final CatalogAdminService admin;
    private final MasterUploadService uploads;

    public CatalogAdminController(CatalogAdminService admin, MasterUploadService uploads) {
        this.admin = admin;
        this.uploads = uploads;
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

    /** One artist's albums, newest release first; every album when {@code artistId} is absent. */
    @GetMapping("/albums")
    public List<AdminAlbumDto> listAlbums(@RequestParam(required = false) UUID artistId) {
        return this.admin.listAlbums(artistId);
    }

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

    /**
     * Any status, newest-updated first. Optional filters: {@code status}, {@code mediaType}
     * (song | sermon | podcast) and {@code q}, a case-insensitive substring of the title.
     * {@code limit} caps at 500. Assets are omitted; GET /media/{id} has them.
     */
    @GetMapping("/media")
    public List<AdminMediaItemDto> listMedia(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String mediaType,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "100") int limit
    ) {
        return this.admin.listMedia(status, mediaType, q, limit);
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

    /**
     * Where to PUT this item's master: a URL that carries its own authorisation, valid for minutes.
     * Draft or failed items only; 409 when a master is already stored (masters are never replaced).
     * Then request the transcode with the returned {@code masterStorageKey}.
     */
    @PostMapping("/media/{id}/upload")
    public MasterUploadDto requestUpload(@PathVariable UUID id, @Valid @RequestBody MasterUploadDto.UploadRequest request) {
        return this.uploads.issue(id, request);
    }

    /**
     * {@code {profile: url}} for every stored output, at any status, so an item can be heard
     * before it is published.
     */
    @GetMapping("/media/{id}/preview")
    public Map<String, String> preview(@PathVariable UUID id) {
        return this.admin.preview(id);
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
