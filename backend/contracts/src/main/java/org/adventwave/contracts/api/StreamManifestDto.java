package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public record StreamManifestDto(
    String mediaItemId,
    int durationMs,
    Double loudnessLufs,
    double targetLufs,
    Double gainDb,
    String waveformUrl,
    String selectedProfile,
    String audioUrl,
    long expiresAtEpochSeconds,
    List<StreamManifestDto.Profile> profiles
) {
    public record Profile(String profile, int bitrateKbps, long byteSize, String codec) {
    }
}
