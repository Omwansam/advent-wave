package org.adventwave.contracts.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Body of {@code PUT /v1/admin/media/{id}/chapters}: replaces the item's chapters, an empty list
 * clearing them (RFC 0004). Starts strictly increase and fall within the item's duration.
 */
public record ChaptersUpdateDto(
    @NotNull @Size(max = 100) List<@Valid @NotNull ChapterDto> chapters
) {
}
