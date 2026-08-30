package org.adventwave.gateway.api;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.media.StreamService;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.StreamManifestDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.user.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseEntity.BodyBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1"})
public class MediaController {
    /**
     * Bounded so one request cannot ask for the whole catalogue. Liked Songs and a queue are
     * both capped well below this; a caller needing more should paginate.
     */
    private static final int MAX_BATCH_IDS = 200;

    private final CatalogService catalog;
    private final StreamService stream;
    private final UserService users;

    public MediaController(CatalogService catalog, StreamService stream, UserService users) {
        this.catalog = catalog;
        this.stream = stream;
        this.users = users;
    }

    /**
     * Resolves many ids at once, in the order asked for, skipping anything unpublished. This
     * is catalog.v1's BatchGetMediaItems on the public surface: the library and player-state
     * endpoints return ids, and without this every one of them costs a request.
     */
    @GetMapping({"/media"})
    public List<TrackDto> batch(@RequestParam("ids") List<UUID> ids) {
        if (ids.size() > MAX_BATCH_IDS) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "at most " + MAX_BATCH_IDS + " ids per request"
            );
        }
        return this.catalog.tracks(ids);
    }

    @GetMapping({"/media/{id}"})
    public TrackDto media(@PathVariable UUID id) {
        return (TrackDto)this.catalog.track(id).orElseThrow(() -> this.notFound("media item", id));
    }

    @GetMapping({"/artists/{id}"})
    public ArtistDto artist(@PathVariable UUID id) {
        return (ArtistDto)this.catalog.artist(id).orElseThrow(() -> this.notFound("artist", id));
    }

    @GetMapping({"/albums/{id}"})
    public AlbumDto album(@PathVariable UUID id) {
        return (AlbumDto)this.catalog.album(id).orElseThrow(() -> this.notFound("album", id));
    }

    @GetMapping({"/media/{id}/stream"})
    public StreamManifestDto manifest(AuthenticatedUser caller, @PathVariable UUID id) {
        String s = this.users.getSettings(caller.id()).audioQuality();
        return (StreamManifestDto)this.stream.manifest(id, caller.id(), s).orElseThrow(() -> this.notFound("media item", id));
    }

    @GetMapping({"/media/{id}/stream/{profile}"})
    public ResponseEntity<Void> playback(
        @PathVariable UUID id,
        @PathVariable String profile,
        @RequestParam("exp") long expiresAt,
        @RequestParam("uid") UUID userId,
        @RequestParam("sig") String signature
    ) {
        if (!this.stream.verifySignature(id, profile, userId, expiresAt, signature)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "invalid or expired playback URL");
        } else {
            String s = this.users.getSettings(userId).audioQuality();
            String s1 = (String)this.stream.resolvePlaybackUrl(id, profile, s).orElseThrow(() -> this.notFound("media item", id));
            return ((BodyBuilder)ResponseEntity.status(HttpStatus.FOUND).location(URI.create(s1))).build();
        }
    }

    private ResponseStatusException notFound(String what, UUID id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " " + id + " not found");
    }
}
