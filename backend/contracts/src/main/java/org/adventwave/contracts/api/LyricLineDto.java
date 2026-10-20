package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * One line of a song's words (RFC 0004). {@code startMs} is where the line begins in the
 * recording, absent when the lyrics are not synced. An empty {@code text} is a blank line
 * between verses.
 */
@JsonInclude(Include.NON_NULL)
public record LyricLineDto(
    @Min(0L) Integer startMs,
    @NotNull @Size(max = 300) String text
) {
}
