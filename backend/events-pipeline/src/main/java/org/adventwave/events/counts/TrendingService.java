package org.adventwave.events.counts;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The read side of the play counts: which items and artists were played most over a window.
 * Returns ids only — resolving them to tracks is the catalogue's job, and keeps this module
 * free of any dependency on it.
 */
@Service
@Transactional(readOnly = true)
public class TrendingService {
    private static final String TOP_ITEMS = """
        SELECT media_item_id
        FROM play_counts_by_item_day
        WHERE day >= CURRENT_DATE - CAST(? AS integer)
        GROUP BY media_item_id
        ORDER BY SUM(plays) DESC, media_item_id
        LIMIT ?
        """;
    private static final String TOP_ARTISTS = """
        SELECT artist_id
        FROM play_counts_by_artist_day
        WHERE day >= CURRENT_DATE - CAST(? AS integer)
        GROUP BY artist_id
        ORDER BY SUM(plays) DESC, artist_id
        LIMIT ?
        """;

    private final JdbcTemplate jdbc;

    public TrendingService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Most-played item ids over the last {@code days} days, most played first. May be short or empty. */
    public List<UUID> topItemIds(int days, int limit) {
        return this.jdbc.queryForList(TOP_ITEMS, UUID.class, days, limit);
    }

    public List<UUID> topArtistIds(int days, int limit) {
        return this.jdbc.queryForList(TOP_ARTISTS, UUID.class, days, limit);
    }
}
