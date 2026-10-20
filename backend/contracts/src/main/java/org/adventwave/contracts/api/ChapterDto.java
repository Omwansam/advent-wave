package org.adventwave.contracts.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** One chapter of a sermon or podcast episode: where it starts and what it is (RFC 0004). */
public record ChapterDto(
    @Min(0L) int startMs,
    @NotBlank @Size(max = 120) String title
) {
}
