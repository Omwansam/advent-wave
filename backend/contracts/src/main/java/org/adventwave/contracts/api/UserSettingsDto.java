package org.adventwave.contracts.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

public record UserSettingsDto(
    @Pattern(regexp = "light|dark") String theme,
    boolean privateSession,
    boolean normalizeAudio,
    boolean crossfadeEnabled,
    @Min(0L) @Max(12L) int crossfadeSec,
    boolean sidebarCollapsed,
    boolean friendActivityCollapsed,
    @Pattern(regexp = "data_saver|normal|high|very_high") String audioQuality
) {
    public static UserSettingsDto defaults() {
        return new UserSettingsDto("light", false, false, false, 6, false, false, "normal");
    }
}
