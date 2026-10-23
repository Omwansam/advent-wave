package org.adventwave.catalog;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.Ensemble;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The profile queries that JPQL does not say well (RFC 0009): filters that are each optional, a
 * church's popularity counted together with its choirs', and only profiles with something
 * published to hear. Returns ids in order; CatalogService loads and maps them.
 */
@Component
public class ArtistDirectory {
    /** "Popular" means plays over this many days, then followers, then the name. */
    static final int POPULAR_WINDOW_DAYS = 30;

    /** A church counts its members' recordings as its own. */
    private static final String HAS_PUBLISHED = """
        EXISTS (SELECT 1 FROM media_items m WHERE m.status = 'published'
                AND (m.artist_id = a.id
                     OR (a.kind = 'church' AND m.artist_id IN (SELECT x.id FROM artists x WHERE x.home_church_id = a.id))))
        """;

    private static final String POPULARITY = """
        LEFT JOIN artists h ON h.id = a.home_church_id
        LEFT JOIN LATERAL (
            SELECT coalesce(sum(c.plays), 0) AS plays FROM play_counts_by_artist_day c
            WHERE c.day >= current_date - :days
              AND (c.artist_id = a.id OR c.artist_id IN (SELECT x.id FROM artists x WHERE x.home_church_id = a.id))
        ) p ON true
        LEFT JOIN LATERAL (SELECT count(*) AS n FROM user_follows_artist f WHERE f.artist_id = a.id) f ON true
        """;

    private static final String MEMBER_ORDER = """
        CASE a.kind WHEN 'choir' THEN 0 WHEN 'group' THEN 1 WHEN 'soloist' THEN 2 WHEN 'preacher' THEN 3 ELSE 4 END,
        CASE a.ensemble WHEN 'main' THEN 0 WHEN 'youth' THEN 1 WHEN 'children' THEN 2 WHEN 'women' THEN 3 WHEN 'men' THEN 4 ELSE 5 END,
        a.name
        """;

    private final NamedParameterJdbcTemplate jdbc;

    public ArtistDirectory(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * {@code GET /v1/artists}. Every field may be null: {@code independent} true keeps choirs,
     * groups and singers with no home church, false keeps those with one; {@code conferenceId} may
     * name a union, which includes its conferences and fields.
     */
    public record Filter(List<ArtistKind> kinds, Ensemble ensemble, Boolean independent, UUID churchId, String conferenceId) {
    }

    public List<UUID> list(Filter filter, int limit) {
        StringBuilder sql = new StringBuilder("SELECT a.id FROM artists a ").append(POPULARITY).append(" WHERE ").append(HAS_PUBLISHED);
        MapSqlParameterSource params = new MapSqlParameterSource("days", POPULAR_WINDOW_DAYS).addValue("limit", limit);
        if (filter.kinds() != null && !filter.kinds().isEmpty()) {
            sql.append(" AND a.kind IN (:kinds)");
            params.addValue("kinds", filter.kinds().stream().map(ArtistKind::wireValue).toList());
        }

        if (filter.ensemble() != null) {
            sql.append(" AND a.ensemble = :ensemble");
            params.addValue("ensemble", filter.ensemble().wireValue());
        }

        if (Boolean.TRUE.equals(filter.independent())) {
            sql.append(" AND a.home_church_id IS NULL AND a.kind IN ('choir', 'group', 'soloist')");
        } else if (Boolean.FALSE.equals(filter.independent())) {
            sql.append(" AND a.home_church_id IS NOT NULL");
        }

        if (filter.churchId() != null) {
            sql.append(" AND a.home_church_id = :church");
            params.addValue("church", filter.churchId());
        }

        if (filter.conferenceId() != null) {
            sql.append(" AND coalesce(a.conference_id, h.conference_id) IN (SELECT id FROM conferences WHERE id = :conference OR parent_id = :conference)");
            params.addValue("conference", filter.conferenceId());
        }

        sql.append(" ORDER BY p.plays DESC, f.n DESC, a.name ASC LIMIT :limit");
        return this.jdbc.queryForList(sql.toString(), params, UUID.class);
    }

    /** A church's members with something to hear: its choirs (main first), then groups, singers, preachers, ministries. */
    public List<UUID> members(UUID churchId) {
        String sql = "SELECT a.id FROM artists a WHERE a.home_church_id = :church AND " + HAS_PUBLISHED + " ORDER BY " + MEMBER_ORDER;
        return this.jdbc.queryForList(sql, new MapSqlParameterSource("church", churchId), UUID.class);
    }

    /** Every member, recordings or not: whose published items a church page plays. */
    public List<UUID> memberIds(UUID churchId) {
        return this.jdbc.queryForList(
            "SELECT id FROM artists WHERE home_church_id = :church", new MapSqlParameterSource("church", churchId), UUID.class
        );
    }

    /** Profiles like this one: the same kind (and ensemble, for a choir), its conference first, then the most popular. */
    public List<UUID> similar(Artist artist, String conferenceId, int limit) {
        StringBuilder sql = new StringBuilder("SELECT a.id FROM artists a ").append(POPULARITY)
            .append(" WHERE a.id <> :self AND a.kind = :kind AND ").append(HAS_PUBLISHED);
        MapSqlParameterSource params = new MapSqlParameterSource("days", POPULAR_WINDOW_DAYS)
            .addValue("self", artist.getId())
            .addValue("kind", artist.getKind().wireValue())
            .addValue("conference", conferenceId)
            .addValue("limit", limit);
        if (artist.getEnsemble() != null) {
            sql.append(" AND a.ensemble = :ensemble");
            params.addValue("ensemble", artist.getEnsemble().wireValue());
        }

        sql.append(" ORDER BY (coalesce(a.conference_id, h.conference_id) = CAST(:conference AS text)) DESC NULLS LAST, p.plays DESC, f.n DESC, a.name ASC LIMIT :limit");
        return this.jdbc.queryForList(sql.toString(), params, UUID.class);
    }

    public long followers(UUID artistId) {
        Long n = this.jdbc.queryForObject(
            "SELECT count(*) FROM user_follows_artist WHERE artist_id = :artist", new MapSqlParameterSource("artist", artistId), Long.class
        );
        return n == null ? 0L : n;
    }

    /** Church profiles with something to hear, per conference they are in. */
    public Map<String, Integer> churchesByConference() {
        Map<String, Integer> counts = new HashMap<>();
        this.jdbc.query(
            "SELECT a.conference_id, count(*) AS n FROM artists a WHERE a.kind = 'church' AND a.conference_id IS NOT NULL AND " + HAS_PUBLISHED + " GROUP BY a.conference_id",
            new MapSqlParameterSource(),
            rs -> {
                counts.put(rs.getString("conference_id"), rs.getInt("n"));
            }
        );
        return counts;
    }

    /** {@code list} and {@code value}, for a church page's own recordings with its members'. */
    static <T> List<T> with(List<T> list, T value) {
        List<T> copy = new ArrayList<>(list);
        copy.add(value);
        return copy;
    }

    static <T> List<T> without(List<T> list, T value) {
        List<T> copy = new ArrayList<>(list);
        copy.remove(value);
        return copy;
    }
}
