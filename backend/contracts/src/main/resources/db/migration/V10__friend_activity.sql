-- Friend activity — RFC 0007 (contracts/rfcs/0007-friend-activity.md): listeners follow one
-- another and see what the people they follow are playing.

-- ---------------------------------------------------------------------------
-- Following another listener. Same shape as user_follows_artist and user_follows_playlist: the
-- follower is user_id. One-way, no approval, as in the reference client.
-- ---------------------------------------------------------------------------

CREATE TABLE user_follows_user (
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followee_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, followee_id),
    CONSTRAINT user_follows_user_not_self CHECK (user_id <> followee_id)
);

-- Follower counts on a profile.
CREATE INDEX user_follows_user_followee_idx ON user_follows_user (followee_id);

-- Finding a friend by name (GET /v1/users?q=), like the title and name indexes in V1.
CREATE INDEX users_display_name_trgm_idx ON users USING gin (display_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- What each listener last played, for the people who follow them. One row per listener,
-- overwritten on every play_started, play_completed and skipped event. Written only outside a
-- private session and while share_activity is on; deleted when either changes, so turning sharing
-- back on reveals nothing played in between.
-- ---------------------------------------------------------------------------

CREATE TABLE listener_activity (
    user_id       UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    media_item_id UUID        NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    -- true from play_started until play_completed or skipped. A closed tab sends neither, so the
    -- reader also ends it once the item's duration has passed since updated_at.
    playing       BOOLEAN     NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Share my listening activity". On by default, as in the reference client; private session
-- (V1) still hides everything while it is on.
ALTER TABLE user_settings ADD COLUMN share_activity BOOLEAN NOT NULL DEFAULT TRUE;
