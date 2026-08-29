package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record AlbumDto(String id, String title, String artist, String artistId, String cover, List<String> songIds, List<TrackDto> tracks) {
    public AlbumDto withoutTracks() {
        return new AlbumDto(this.id, this.title, this.artist, this.artistId, this.cover, this.songIds, null);
    }
}
