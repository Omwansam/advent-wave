package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record PlayerStateDto(
    String currentSongId,
    List<String> queue,
    List<String> orderedQueue,
    @Min(0L) int currentIndex,
    @Min(0L) int positionMs,
    @DecimalMin("0.0") @DecimalMax("1.0") double volume,
    boolean shuffle,
    String repeat,
    List<TrackDto> tracks,
    String updatedAt
) {
    public static PlayerStateDto empty() {
        return new PlayerStateDto(null, List.of(), null, 0, 0, 0.85, false, "off", List.of(), null);
    }
}
