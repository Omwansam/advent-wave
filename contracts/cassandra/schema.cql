-- AdventWave Cassandra contract — PLANNED, NOT IMPLEMENTED.
--
-- No driver, keyspace, or configuration exists in the codebase. The interim implementation is
-- the PostgreSQL table listening_history, reached only through ListeningHistoryRepository so
-- that workstream C can swap the store without touching a controller. See README.md for the
-- semantic difference between the two, which is a contract decision, not a detail.
--
-- Source: BACKEND_BUILD_PLAN.md §1 day 4. Query-first design. Nothing below is invented beyond
-- that section; the columns of listening_history_by_user are the columns the gateway already
-- writes to Postgres today, plus media_type from the event.

CREATE KEYSPACE IF NOT EXISTS adventwave
  WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

-- Read pattern: "the last N things this user played", newest first. Written by workstream C's
-- consumer of playback.events.v1 — only for events where counted = true AND private = false.
-- The ListeningHistory page and the client cap history at 100, so the read is LIMIT 100 and
-- rows expire rather than accumulate in an unbounded partition.
CREATE TABLE IF NOT EXISTS adventwave.listening_history_by_user (
  user_id       uuid,
  played_at     timestamp,
  media_item_id uuid,
  media_type    text,          -- song | sermon | podcast, copied from the event
  ms_played     int,
  completed     boolean,       -- PlayCountingPolicy.isCompleted: ms_played >= 95% of duration
  session_id    uuid,
  device        text,
  PRIMARY KEY ((user_id), played_at)
) WITH CLUSTERING ORDER BY (played_at DESC)
  AND default_time_to_live = 7776000;   -- 90 days; the plan says "set a TTL", the number is a proposal

-- Read pattern: plays per item per day, for trending and for what is reported to churches.
-- Counter columns; incremented once per counted, non-private play.
CREATE TABLE IF NOT EXISTS adventwave.play_counts_by_item_day (
  media_item_id uuid,
  day           date,
  plays         counter,
  PRIMARY KEY ((media_item_id), day)
);

-- Read pattern: plays per artist per day. Same write rule.
CREATE TABLE IF NOT EXISTS adventwave.play_counts_by_artist_day (
  artist_id uuid,
  day       date,
  plays     counter,
  PRIMARY KEY ((artist_id), day)
);
