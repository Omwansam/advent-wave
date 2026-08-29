package org.adventwave.gateway.assemble;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.platform.library.PlaylistSummary;
import org.springframework.stereotype.Component;

@Component
public class PlaylistAssembler {
    private final CatalogService catalog;

    public PlaylistAssembler(CatalogService catalog) {
        this.catalog = catalog;
    }

    public PlaylistDto resolve(PlaylistSummary summary) {
        List<TrackDto> list = this.catalog.tracks(summary.songIds());
        return this.toDto(summary, list);
    }

    public PlaylistDto summarise(PlaylistSummary summary) {
        return this.toDto(summary, null);
    }

    public List<PlaylistDto> resolveAll(List<PlaylistSummary> summaries) {
        if (summaries.isEmpty()) {
            return List.of();
        } else {
            List<UUID> list = new ArrayList<>();
            summaries.forEach(summary -> list.addAll(summary.songIds()));
            List<TrackDto> list1 = this.catalog.tracks(list.stream().distinct().toList());
            Map<String, TrackDto> map = new HashMap<>();
            list1.forEach(track -> map.put(track.id(), track));
            return summaries.stream()
                .map(summary -> this.toDto(summary, summary.songIds().stream().map(id -> map.get(id.toString())).filter(Objects::nonNull).toList()))
                .toList();
        }
    }

    private PlaylistDto toDto(PlaylistSummary summary, List<TrackDto> tracks) {
        return new PlaylistDto(
            summary.id().toString(),
            summary.title(),
            summary.description(),
            summary.coverUrl(),
            summary.songIds().stream().map(UUID::toString).toList(),
            tracks,
            summary.curated(),
            summary.ownerId() == null ? null : summary.ownerId().toString(),
            summary.legacyId()
        );
    }
}
