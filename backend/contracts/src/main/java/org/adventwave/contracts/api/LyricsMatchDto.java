package org.adventwave.contracts.api;

/**
 * A song found by its words rather than its title (RFC 0004), with the first line that matched
 * the query, so the listener can see why it is there.
 */
public record LyricsMatchDto(TrackDto track, String line) {
}
