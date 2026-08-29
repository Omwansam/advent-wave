package org.adventwave.gateway.api;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.PlayerStateDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.player.PlayerStateService;
import org.adventwave.platform.player.PlayerStateService.Buffered;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1/player-state"})
public class PlayerStateController {
    private final PlayerStateService player;
    private final CatalogService catalog;

    public PlayerStateController(PlayerStateService player, CatalogService catalog) {
        this.player = player;
        this.catalog = catalog;
    }

    @GetMapping
    public PlayerStateDto get(AuthenticatedUser caller) {
        return this.player
            .get(caller.id())
            .map(
                state -> new PlayerStateDto(
                    state.mediaItemId(),
                    state.queue(),
                    state.orderedQueue(),
                    state.currentIndex(),
                    state.positionMs(),
                    state.volume(),
                    state.shuffle(),
                    state.repeatMode(),
                    this.catalog.tracks(state.queue().stream().map(UUID::fromString).toList()),
                    Instant.ofEpochMilli(state.updatedAtEpochMs()).toString()
                )
            )
            .orElseGet(PlayerStateDto::empty);
    }

    @PutMapping
    public PlayerStateDto save(AuthenticatedUser caller, @Valid @RequestBody PlayerStateDto state) {
        this.player
            .save(
                caller.id(),
                new Buffered(
                    state.currentSongId(),
                    state.positionMs(),
                    state.queue() == null ? List.of() : state.queue(),
                    state.orderedQueue(),
                    state.currentIndex(),
                    state.shuffle(),
                    state.repeat(),
                    state.volume(),
                    System.currentTimeMillis()
                )
            );
        return this.get(caller);
    }
}
