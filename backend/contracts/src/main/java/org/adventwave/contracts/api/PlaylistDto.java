package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record PlaylistDto(
    String id, String title, String description, String cover, List<String> songIds, List<TrackDto> songs, boolean isCurated, String ownerId, String legacyId
) {
    public PlaylistDto unresolved() {
        return new PlaylistDto(this.id, this.title, this.description, this.cover, this.songIds, null, this.isCurated, this.ownerId, this.legacyId);
    }
}
