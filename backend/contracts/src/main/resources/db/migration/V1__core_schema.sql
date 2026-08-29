-- AdventWave core schema.
-- Source: BACKEND_BUILD_PLAN.md §1 "Day 1 — Domain model → Postgres schema".
--
-- Decisions taken from the plan and frozen here:
--   * songs / sermons / podcasts share one `media_items` table with a `media_type`
--     discriminator. In mockData.js the three have identical shapes; they differ only in
--     semantics. Three parallel catalogs would fork the search index, the event schema and
--     the recommendation features.
--   * `player_state.queue` stores media item IDs, never denormalised objects.
--   * Publication is gated on a granted licence by a database trigger, not by application
--     code (plan §3 "Why H starts in Week 0").
--
-- Additions to the plan's starting DDL, each marked ADDED with its justification.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram index behind search until Elasticsearch lands (WS B)

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_auth_id TEXT        NOT NULL UNIQUE,   -- the IdP's `sub` claim
    email            TEXT        NOT NULL UNIQUE,
    display_name     TEXT        NOT NULL,
    region           TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
    user_id                  UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    theme                    TEXT    NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    private_session          BOOLEAN NOT NULL DEFAULT FALSE,
    normalize_audio          BOOLEAN NOT NULL DEFAULT FALSE,
    crossfade_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    -- ADDED: useUiStore persists crossfadeSec alongside crossfadeEnabled. Omitting it would
    -- leave one half of a settings pair server-side and the other in localStorage.
    crossfade_sec            SMALLINT NOT NULL DEFAULT 6 CHECK (crossfade_sec BETWEEN 0 AND 12),
    sidebar_collapsed        BOOLEAN NOT NULL DEFAULT FALSE,
    friend_activity_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    -- ADDED: the stream endpoint needs a quality preference to resolve profile `auto`
    -- against the §11.2 ladder.
    audio_quality            TEXT    NOT NULL DEFAULT 'normal'
                             CHECK (audio_quality IN ('data_saver', 'normal', 'high', 'very_high')),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Contributors
-- ---------------------------------------------------------------------------

CREATE TABLE churches (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    country        TEXT,
    region         TEXT,
    contact_email  TEXT,
    consent_status TEXT        NOT NULL DEFAULT 'none'
                   CHECK (consent_status IN ('none', 'pending', 'granted', 'revoked')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,
    cover_url  TEXT,
    bio        TEXT,
    church_id  UUID        REFERENCES churches (id) ON DELETE SET NULL,
    verified   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- The frontend's useLibraryStore.followedArtistNames stores NAMES, not IDs. A unique
    -- name is what lets that client state be resolved to artist IDs during the WS G
    -- migration (plan §1 day 1, open question 2).
    CONSTRAINT artists_name_unique UNIQUE (name)
);

CREATE TABLE albums (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
    artist_id    UUID NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
    cover_url    TEXT,
    release_date DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- getAllAlbums() keys albums on `album::artist`; the same album title from two artists
    -- is two albums. Preserve that identity rule server-side.
    CONSTRAINT albums_title_artist_unique UNIQUE (title, artist_id)
);

-- ---------------------------------------------------------------------------
-- Licensing — gates publication
-- ---------------------------------------------------------------------------

CREATE TABLE licenses (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id             UUID        NOT NULL REFERENCES churches (id) ON DELETE RESTRICT,
    consent_status        TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (consent_status IN ('pending', 'granted', 'revoked', 'expired')),
    consent_document_url  TEXT,
    territory             TEXT        NOT NULL DEFAULT 'worldwide',
    granted_at            TIMESTAMPTZ,
    expires_at            TIMESTAMPTZ,
    revenue_share_pct     NUMERIC(5, 2) CHECK (revenue_share_pct BETWEEN 0 AND 100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX licenses_church_idx ON licenses (church_id);

-- ---------------------------------------------------------------------------
-- Catalog (unified)
-- ---------------------------------------------------------------------------

CREATE TABLE media_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_type      TEXT        NOT NULL CHECK (media_type IN ('song', 'sermon', 'podcast')),
    title           TEXT        NOT NULL,
    artist_id       UUID        NOT NULL REFERENCES artists (id) ON DELETE RESTRICT,
    album_id        UUID        REFERENCES albums (id) ON DELETE SET NULL,
    duration_ms     INTEGER     NOT NULL CHECK (duration_ms > 0),
    cover_url       TEXT,
    genre           TEXT,
    language        TEXT,
    region          TEXT,
    popularity      SMALLINT    NOT NULL DEFAULT 60 CHECK (popularity BETWEEN 0 AND 100),
    status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'processing', 'published', 'withdrawn', 'failed')),
    license_id      UUID        REFERENCES licenses (id) ON DELETE RESTRICT,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Loudness is a property of the recording, measured once from the master, and applies to
    -- every derivative (plan §11.3). The client applies gain at playback; we never re-encode.
    loudness_lufs   NUMERIC(5, 2),
    true_peak_dbfs  NUMERIC(5, 2),
    master_storage_key TEXT,

    -- ADDED, both removable once WS G has cut over and WS H has supplied real masters:
    --   legacy_id     — the mockData.js identifier ('s1', 'ser2', 'ep3'), so the client can
    --                   cross-reference during migration and so seeding is idempotent.
    --   seed_source_url — placeholder audio for items that have no transcoded assets yet.
    --                   Real items serve from media_assets via a signed URL and leave this NULL.
    legacy_id       TEXT UNIQUE,
    seed_source_url TEXT
);

CREATE INDEX media_items_type_status_idx  ON media_items (media_type, status);
CREATE INDEX media_items_artist_idx       ON media_items (artist_id);
CREATE INDEX media_items_album_idx        ON media_items (album_id);
CREATE INDEX media_items_popularity_idx   ON media_items (popularity DESC);
CREATE INDEX media_items_region_idx       ON media_items (region);
CREATE INDEX media_items_title_trgm_idx   ON media_items USING gin (title gin_trgm_ops);
CREATE INDEX artists_name_trgm_idx        ON artists     USING gin (name  gin_trgm_ops);
CREATE INDEX albums_title_trgm_idx        ON albums      USING gin (title gin_trgm_ops);

-- One row per transcode output (plan §11.2 ladders, §11.6 completed event).
CREATE TABLE media_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_item_id   UUID    NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    profile         TEXT    NOT NULL,     -- 'aac_24_hev2' | 'aac_64' | 'aac_96' | 'aac_128' | 'aac_160' | 'aac_320'
    codec           TEXT    NOT NULL,
    bitrate_kbps    SMALLINT NOT NULL CHECK (bitrate_kbps > 0),
    container       TEXT    NOT NULL DEFAULT 'm4a',
    sample_rate_hz  INTEGER NOT NULL,
    channels        SMALLINT NOT NULL CHECK (channels BETWEEN 1 AND 8),
    storage_key     TEXT    NOT NULL,
    -- Read from the encoded file, never computed as bitrate x duration (plan §11.7).
    byte_size       BIGINT  NOT NULL CHECK (byte_size > 0),
    checksum_sha256 TEXT    NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT media_assets_item_profile_unique UNIQUE (media_item_id, profile)
);

-- ---------------------------------------------------------------------------
-- Publication gate: no item reaches 'published' without a granted licence.
-- A CHECK constraint cannot reference another table, so this is a trigger — it is still a
-- database constraint, which is what plan §3 and §11.6 require. Application code cannot
-- route around it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_publication_requires_granted_license()
RETURNS TRIGGER AS $$
DECLARE
    licence_state TEXT;
    licence_expiry TIMESTAMPTZ;
BEGIN
    IF NEW.status <> 'published' THEN
        RETURN NEW;
    END IF;

    IF NEW.license_id IS NULL THEN
        RAISE EXCEPTION
            'media_item % cannot be published: no licence attached', NEW.id
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT consent_status, expires_at INTO licence_state, licence_expiry
    FROM licenses WHERE id = NEW.license_id;

    IF licence_state IS DISTINCT FROM 'granted' THEN
        RAISE EXCEPTION
            'media_item % cannot be published: licence % is %', NEW.id, NEW.license_id, licence_state
            USING ERRCODE = 'check_violation';
    END IF;

    IF licence_expiry IS NOT NULL AND licence_expiry <= now() THEN
        RAISE EXCEPTION
            'media_item % cannot be published: licence % expired at %', NEW.id, NEW.license_id, licence_expiry
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_items_publication_gate
    BEFORE INSERT OR UPDATE OF status, license_id ON media_items
    FOR EACH ROW EXECUTE FUNCTION enforce_publication_requires_granted_license();

-- ---------------------------------------------------------------------------
-- Curation & user library
-- ---------------------------------------------------------------------------

CREATE TABLE playlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID REFERENCES users (id) ON DELETE CASCADE,   -- NULL = curated by AdventWave
    title       TEXT        NOT NULL,
    description TEXT,
    cover_url   TEXT,
    is_curated  BOOLEAN     NOT NULL DEFAULT FALSE,
    is_public   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_id   TEXT UNIQUE,                                     -- ADDED: see media_items.legacy_id
    CONSTRAINT playlists_curated_has_no_owner CHECK (NOT (is_curated AND owner_id IS NOT NULL))
);

CREATE INDEX playlists_owner_idx ON playlists (owner_id);

CREATE TABLE playlist_items (
    playlist_id   UUID        NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    media_item_id UUID        NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    position      INTEGER     NOT NULL,
    added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    added_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    PRIMARY KEY (playlist_id, media_item_id)
);

CREATE INDEX playlist_items_order_idx ON playlist_items (playlist_id, position);

-- Covers both likedSongIds and savedSermonIds. `collection` resolves plan §1 day 1 open
-- question 1: the UI keeps Liked Songs and Saved Sermons as separate shelves, so the
-- distinction has to survive the round trip. One table, one discriminator — same reasoning
-- as media_items.
CREATE TABLE user_likes (
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    media_item_id UUID        NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    collection    TEXT        NOT NULL DEFAULT 'liked_songs'
                  CHECK (collection IN ('liked_songs', 'saved_sermons')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, media_item_id, collection)
);

CREATE INDEX user_likes_user_created_idx ON user_likes (user_id, created_at DESC);

CREATE TABLE user_follows_artist (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    artist_id  UUID        NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE user_follows_playlist (
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    playlist_id UUID        NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, playlist_id)
);

-- ---------------------------------------------------------------------------
-- Cross-device playback resume
-- ---------------------------------------------------------------------------

CREATE TABLE player_state (
    user_id       UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    media_item_id UUID REFERENCES media_items (id) ON DELETE SET NULL,
    position_ms   INTEGER NOT NULL DEFAULT 0 CHECK (position_ms >= 0),
    -- Arrays of media item IDs. Never denormalised objects (plan §1 day 1, open question 3).
    queue         JSONB   NOT NULL DEFAULT '[]'::jsonb,
    ordered_queue JSONB,
    current_index INTEGER NOT NULL DEFAULT 0 CHECK (current_index >= 0),
    shuffle       BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_mode   TEXT    NOT NULL DEFAULT 'off' CHECK (repeat_mode IN ('off', 'all', 'one')),
    -- double precision rather than NUMERIC: the entity field is a double, and a numeric column
    -- would fail Hibernate's schema validation on every boot for no gain on a 0..1 value.
    volume        DOUBLE PRECISION NOT NULL DEFAULT 0.85 CHECK (volume BETWEEN 0 AND 1),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Listening history
--
-- TEMPORARY. This is workstream C's table — listening_history_by_user in Cassandra
-- (plan §1 day 4). It lives in Postgres only so /v1/history works before Cassandra exists,
-- and it is read and written exclusively through ListeningHistoryRepository so that C can
-- swap the implementation without touching a controller. Capped at 100 rows per user to
-- match the Cassandra read limit and useLibraryStore's MAX_RECENT.
-- ---------------------------------------------------------------------------

CREATE TABLE listening_history (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    media_item_id UUID        NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    played_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ms_played     INTEGER     NOT NULL DEFAULT 0,
    completed     BOOLEAN     NOT NULL DEFAULT FALSE,
    session_id    UUID,
    device        TEXT,
    CONSTRAINT listening_history_user_item_unique UNIQUE (user_id, media_item_id)
);

CREATE INDEX listening_history_user_played_idx ON listening_history (user_id, played_at DESC);

-- ---------------------------------------------------------------------------
-- Presentation
-- ---------------------------------------------------------------------------

CREATE TABLE discover_categories (
    id         TEXT PRIMARY KEY,        -- 'worship', 'kenya', ... — stable, referenced by ?cat=
    label      TEXT    NOT NULL,
    gradient   TEXT,
    cover_url  TEXT,
    sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE discover_category_items (
    category_id   TEXT NOT NULL REFERENCES discover_categories (id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    position      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id, media_item_id)
);

-- ---------------------------------------------------------------------------
-- The seam workstream C depends on.
--
-- Every domain write that changes catalog or library state writes an outbox row in the SAME
-- transaction (plan §6 invariant for workstream A). Debezium reads this table from the WAL;
-- `published_at` exists for the interim poller and for observability, and is set by whatever
-- ends up publishing.
-- ---------------------------------------------------------------------------

CREATE TABLE outbox (
    id             BIGSERIAL PRIMARY KEY,
    event_id       UUID        NOT NULL UNIQUE,   -- consumers are idempotent on this (plan §6, WS C)
    aggregate_type TEXT        NOT NULL,          -- 'media_item' | 'playlist' | 'library' | 'playback'
    aggregate_id   TEXT        NOT NULL,
    event_type     TEXT        NOT NULL,          -- maps to the topic in contracts/kafka
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);

CREATE INDEX outbox_unpublished_idx ON outbox (id) WHERE published_at IS NULL;
CREATE INDEX outbox_aggregate_idx   ON outbox (aggregate_type, aggregate_id);
