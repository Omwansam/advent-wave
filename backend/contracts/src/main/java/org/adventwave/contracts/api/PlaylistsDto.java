package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/playlists}: the curated catalogue plus the caller's own, with
 * tracks resolved. {@code GET /v1/library} deliberately returns the lightweight id-only view
 * instead — this is the one to call when the playlists have to be rendered or played.
 */
public record PlaylistsDto(List<PlaylistDto> curated, List<PlaylistDto> mine) {
}
