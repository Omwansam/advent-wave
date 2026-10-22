package org.adventwave.catalog;

/** How much is published, for the public website (RFC 0008). Counts published items only. */
public record CatalogTotals(long songs, long sermons, long podcasts, long durationMs, long artists, long churches) {
}
