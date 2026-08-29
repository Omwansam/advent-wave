package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record ArtistDto(String id, String name, String slug, String cover, boolean verified, List<String> songIds, List<TrackDto> tracks) {
    public ArtistDto withoutTracks() {
        return new ArtistDto(this.id, this.name, this.slug, this.cover, this.verified, this.songIds, null);
    }
}
