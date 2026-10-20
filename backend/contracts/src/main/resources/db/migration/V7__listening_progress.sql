-- Where a listener stopped in each sermon and podcast episode — RFC 0003
-- (contracts/rfcs/0003-listening-progress.md).
--
-- player_state holds one position, the current item's. This holds one per item, so a sermon left
-- halfway on Friday evening resumes there on Sabbath afternoon, on any device, and the Sermons and
-- Podcasts pages can filter to In progress / Unplayed.
--
-- Spoken word only. The gateway refuses songs (MediaType.isSpeech); a row per song played would be
-- listening_history again under another name.
--
-- Not listening history, so a private session does not suppress it: nobody but the owner ever sees
-- a row, and nothing is learnt from it. No outbox row either — like player_state, this is the
-- listener's own playback position, not library state, and no consumer needs it.

CREATE TABLE listening_progress (
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    media_item_id UUID        NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    position_ms   INTEGER     NOT NULL CHECK (position_ms >= 0),
    -- The client's word: it saw the item end, or stop within its last moments. Not re-derived
    -- from media_items.duration_ms, which can describe a different recording than the one served.
    completed     BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Stamped by the server on every write; last write wins.
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, media_item_id)
);

-- GET /v1/progress reads newest-first, and the per-listener trim deletes from the old end.
CREATE INDEX listening_progress_user_updated_idx ON listening_progress (user_id, updated_at DESC);
