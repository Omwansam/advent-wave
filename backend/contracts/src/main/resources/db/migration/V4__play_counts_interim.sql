-- Play counts and consumer idempotency — workstream C's first tables.
--
-- TEMPORARY, same footing as listening_history: these are the Cassandra tables from
-- contracts/cassandra/schema.cql (play_counts_by_item_day, play_counts_by_artist_day) kept in
-- Postgres so trending can be real before Cassandra exists. Written only by
-- org.adventwave.events.counts.PlayCountRecorder, read only by TrendingService, so the swap is
-- one module's implementation. Column names match the CQL exactly; `plays` is a plain integer
-- because Postgres has no counter type — the writer does the increment.

CREATE TABLE play_counts_by_item_day (
    media_item_id UUID    NOT NULL REFERENCES media_items (id) ON DELETE CASCADE,
    day           DATE    NOT NULL,
    plays         INTEGER NOT NULL DEFAULT 0 CHECK (plays >= 0),
    PRIMARY KEY (media_item_id, day)
);

CREATE INDEX play_counts_by_item_day_recent_idx ON play_counts_by_item_day (day DESC, plays DESC);

CREATE TABLE play_counts_by_artist_day (
    artist_id UUID    NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
    day       DATE    NOT NULL,
    plays     INTEGER NOT NULL DEFAULT 0 CHECK (plays >= 0),
    PRIMARY KEY (artist_id, day)
);

CREATE INDEX play_counts_by_artist_day_recent_idx ON play_counts_by_artist_day (day DESC, plays DESC);

-- Consumers are idempotent on event_id (contracts/kafka/README.md). This is how: a handler
-- claims (event_id, handler) before it acts, and a replay — Kafka redelivery, or the interim
-- dispatcher re-reading after a crash — finds the row already there and does nothing.
-- This table is permanent, not interim: it is needed under every transport.
CREATE TABLE processed_events (
    event_id     UUID        NOT NULL,
    handler      TEXT        NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, handler)
);
