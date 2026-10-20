package org.adventwave.contracts.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Body of {@code PUT /v1/admin/media/{id}/lyrics}: replaces the item's lyrics (RFC 0004). Every
 * line has a {@code startMs}, strictly increasing, or none does.
 */
public record LyricsUpdateDto(
    @NotNull @Size(min = 1, max = 400) List<@Valid @NotNull LyricLineDto> lines,
    @Size(max = 35) String language,
    @NotBlank @Pattern(regexp = "public_domain|contributor|licensed") String rightsBasis,
    @NotBlank @Size(max = 300) String credit
) {
}
