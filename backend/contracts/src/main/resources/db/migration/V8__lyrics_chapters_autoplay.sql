-- Hymn lyrics, sermon chapters and the autoplay setting — RFC 0004
-- (contracts/rfcs/0004-lyrics-chapters-autoplay.md).

-- ---------------------------------------------------------------------------
-- Lyrics: songs only (the gateway refuses speech items). One header row per item, its lines in
-- order beneath it.
-- ---------------------------------------------------------------------------

CREATE TABLE media_lyrics (
    media_item_id UUID        PRIMARY KEY REFERENCES media_items (id) ON DELETE CASCADE,
    -- BCP 47 tag of the words, which can differ from the item's: an English hymn sung in Swahili.
    language      TEXT,
    -- The words carry their own rights, separate from the recording's licence: a church can own
    -- its recording of a hymn whose text belongs to someone else.
    --   public_domain  the text is out of copyright everywhere we serve
    --   contributor    the contributing church owns the words
    --   licensed       we hold permission from whoever does; `credit` names them
    rights_basis  TEXT        NOT NULL CHECK (rights_basis IN ('public_domain', 'contributor', 'licensed')),
    -- Shown under the lyrics, e.g. 'Words: Fanny J. Crosby, 1873'.
    credit        TEXT        NOT NULL CHECK (btrim(credit) <> ''),
    -- Every line joined by newlines, kept by the writer for search. Not a second source of truth:
    -- the lines are; this is rebuilt from them on every write.
    plain_text    TEXT        NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Behind the lyrics match in GET /v1/search, like the title and name indexes in V1.
CREATE INDEX media_lyrics_plain_text_trgm_idx ON media_lyrics USING gin (plain_text gin_trgm_ops);

CREATE TABLE media_lyric_lines (
    media_item_id UUID    NOT NULL REFERENCES media_lyrics (media_item_id) ON DELETE CASCADE,
    position      INTEGER NOT NULL CHECK (position >= 0),
    -- Null when the lyrics are not synced. All of an item's lines have a time or none do, and the
    -- times strictly increase; the writer checks both, since a CHECK cannot see sibling rows.
    start_ms      INTEGER CHECK (start_ms >= 0),
    -- Empty is allowed: a blank line between verses is part of the layout.
    text          TEXT    NOT NULL,
    PRIMARY KEY (media_item_id, position)
);

-- ---------------------------------------------------------------------------
-- Chapters: sermons and podcasts only. Scripture reading, sermon, appeal, closing hymn.
-- ---------------------------------------------------------------------------

CREATE TABLE media_chapters (
    media_item_id UUID     NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    position      SMALLINT NOT NULL CHECK (position >= 0),
    start_ms      INTEGER  NOT NULL CHECK (start_ms >= 0),
    title         TEXT     NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 120),
    PRIMARY KEY (media_item_id, position),
    UNIQUE (media_item_id, start_ms)
);

-- ---------------------------------------------------------------------------
-- Autoplay: when the queue ends, keep playing something similar. On by default, as the
-- reference client ships it; the listener turns it off in Settings.
-- ---------------------------------------------------------------------------

ALTER TABLE user_settings ADD COLUMN autoplay BOOLEAN NOT NULL DEFAULT TRUE;
