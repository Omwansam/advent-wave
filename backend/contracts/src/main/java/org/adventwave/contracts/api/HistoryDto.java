package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/history}. {@code entries} is newest-first and carries the
 * play timestamps; {@code tracks} resolves those ids so the client needs no second call.
 */
public record HistoryDto(List<LibraryDto.HistoryEntry> entries, List<TrackDto> tracks) {
}
