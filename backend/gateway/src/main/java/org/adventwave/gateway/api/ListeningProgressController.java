package org.adventwave.gateway.api;

import jakarta.validation.Valid;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.ListeningProgressDto;
import org.adventwave.contracts.api.ListeningProgressListDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.domain.ListeningProgress;
import org.adventwave.platform.player.ListeningProgressService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Where the caller stopped in each sermon and podcast episode, so the next play resumes there on
 * any device (RFC 0003). player_state keeps only the current item's position; this keeps one per
 * item. Songs are refused: nobody resumes a hymn at verse three.
 */
@RestController
@RequestMapping({"/v1/progress"})
public class ListeningProgressController {
    private final ListeningProgressService progress;
    private final CatalogService catalog;

    public ListeningProgressController(ListeningProgressService progress, CatalogService catalog) {
        this.progress = progress;
        this.catalog = catalog;
    }

    // Method names are the generated operationIds; plain list/save would collide with other
    // controllers' and rename theirs (save -> save_1) in the published contract.
    @GetMapping
    public ListeningProgressListDto listProgress(AuthenticatedUser caller) {
        return new ListeningProgressListDto(this.progress.list(caller.id()).stream().map(ListeningProgressController::toDto).toList());
    }

    @PutMapping({"/{mediaItemId}"})
    public ListeningProgressDto saveProgress(AuthenticatedUser caller, @PathVariable UUID mediaItemId, @Valid @RequestBody ListeningProgressDto body) {
        MediaItem item = this.catalog
            .entity(mediaItemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "media item " + mediaItemId + " not found"));
        if (!item.getMediaType().isSpeech()) {
            throw new IllegalArgumentException("progress is kept for sermons and podcasts only");
        }
        return toDto(this.progress.save(caller.id(), mediaItemId, body.positionMs(), body.completed()));
    }

    private static ListeningProgressDto toDto(ListeningProgress row) {
        return new ListeningProgressDto(row.getMediaItemId().toString(), row.getPositionMs(), row.isCompleted(), row.getUpdatedAt().toString());
    }
}
