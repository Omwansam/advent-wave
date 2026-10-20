package org.adventwave.contracts.api;

import java.util.List;

/**
 * Response for {@code GET /v1/media/{id}/chapters} and the admin chapters operations
 * (RFC 0004): in order, earliest first; empty when the item has none.
 */
public record ChaptersDto(String mediaItemId, List<ChapterDto> chapters) {
}
