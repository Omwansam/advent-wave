package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public record TrackDto(
    String id,
    String title,
    String artist,
    String album,
    int duration,
    String cover,
    String audioUrl,
    MediaType mediaType,
    String artistId,
    String albumId,
    int durationMs,
    String genre,
    String language,
    String region,
    int popularity,
    String legacyId
) {
    public static int toSeconds(int durationMs) {
        return Math.round(durationMs / 1000.0F);
    }
}
