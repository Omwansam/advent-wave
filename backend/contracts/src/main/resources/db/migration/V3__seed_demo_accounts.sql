-- AdventWave demo accounts.
--
-- Hand-written, unlike V2 which is generated from mockData.js. This seeds the *user* side of
-- the schema: accounts, settings, library, playlists, history and player state. Without it a
-- fresh database has a catalogue but no listeners, so every rail on Home renders empty and
-- the recommender has no taste profile to work from.
--
-- HOW LOGIN WORKS HERE
--
-- POST /v1/auth/session checks no password — it stands in for the managed IdP that has not
-- been chosen yet (plan §1 pre-work). It matches an account by external_auth_id, which it
-- derives as 'dev|' + the lowercased email. Signing in with one of the emails below lands on
-- that seeded account; any other email silently creates a fresh, empty one.
--
--   listener@adventwave.app   full library — likes, follows, playlists, a week of history
--   pastor@adventwave.app     speech-heavy library, dark theme, PRIVATE SESSION ON
--   newuser@adventwave.app    deliberately empty — cold start and empty states
--
-- The login form's password field is ignored; anything at least one character works. The
-- frontend prefills listener@adventwave.app (src/data/demoLogin.js).
--
-- WHY NOTHING IS KEYED BY A HARDCODED USER ID
--
-- Any of these accounts may already exist: signing in creates one on demand, so a developer
-- who logged in as listener@adventwave.app before this migration ran has a row with a random
-- id. Every statement below therefore resolves the account by external_auth_id rather than
-- assuming the id it would have been given. The same applies to catalogue rows, which are
-- referenced by legacy_id and artists by name — restating V2's generated UUIDs inside a
-- hand-edited file is how the two drift the first time the generator changes.
--
-- display_name is not authoritative: the session endpoint overwrites it with whatever the
-- caller sends, and the web client sends the local part of the email.
--
-- No outbox rows are written. The outbox records domain events the application produced;
-- installing fixtures is not one of those, and Debezium reads these inserts from the WAL
-- regardless of whether we describe them twice.
--
-- Every statement is idempotent, so this file can be re-run by hand to reset the demo
-- accounts. Only user_settings is overwritten on re-run; library rows are left alone.

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

INSERT INTO users (external_auth_id, email, display_name, region) VALUES
  ('dev|listener@adventwave.app', 'listener@adventwave.app', 'Listener', 'kenya'),
  ('dev|pastor@adventwave.app',   'pastor@adventwave.app',   'Pastor',   'kenya'),
  ('dev|newuser@adventwave.app',  'newuser@adventwave.app',  'New User', 'global')
ON CONFLICT (external_auth_id) DO NOTHING;

-- Settings are seeded explicitly: UserService only creates a row when it provisions a new
-- account, and an account that already existed has defaults rather than these values.
-- DO UPDATE, not DO NOTHING — this file defines what the demo accounts look like.
INSERT INTO user_settings (user_id, theme, private_session, normalize_audio,
                           crossfade_enabled, crossfade_sec, sidebar_collapsed,
                           friend_activity_collapsed, audio_quality)
SELECT u.id, x.theme, x.private_session, x.normalize_audio,
       x.crossfade_enabled, x.crossfade_sec, x.sidebar_collapsed,
       x.friend_activity_collapsed, x.audio_quality
FROM (VALUES
    -- normalize_audio on: the catalogue mixes studio masters with camp-meeting recordings,
    -- so this is the setting that shows the loudness metadata doing something (plan §11.3).
    ('dev|listener@adventwave.app', 'light', FALSE, TRUE,  FALSE, 6::smallint, FALSE, FALSE, 'high'),
    -- private_session on, and deliberately no listening history below: sign in as this
    -- account, play anything, and /v1/history must stay empty. That is the §1 day 2 privacy
    -- rule, visible without reading a test.
    ('dev|pastor@adventwave.app',   'dark',  TRUE,  TRUE,  FALSE, 6::smallint, FALSE, TRUE,  'data_saver'),
    ('dev|newuser@adventwave.app',  'light', FALSE, FALSE, FALSE, 6::smallint, FALSE, FALSE, 'normal')
  ) AS x(auth_id, theme, private_session, normalize_audio, crossfade_enabled,
         crossfade_sec, sidebar_collapsed, friend_activity_collapsed, audio_quality)
JOIN users u ON u.external_auth_id = x.auth_id
ON CONFLICT (user_id) DO UPDATE SET
  theme                     = EXCLUDED.theme,
  private_session           = EXCLUDED.private_session,
  normalize_audio           = EXCLUDED.normalize_audio,
  crossfade_enabled         = EXCLUDED.crossfade_enabled,
  crossfade_sec             = EXCLUDED.crossfade_sec,
  sidebar_collapsed         = EXCLUDED.sidebar_collapsed,
  friend_activity_collapsed = EXCLUDED.friend_activity_collapsed,
  audio_quality             = EXCLUDED.audio_quality,
  updated_at                = now();

-- ---------------------------------------------------------------------------
-- listener@adventwave.app — the account most demos should use
-- ---------------------------------------------------------------------------

-- Liked songs. created_at is staggered so "recently liked" has a deterministic order rather
-- than depending on insert order.
INSERT INTO user_likes (user_id, media_item_id, collection, created_at)
SELECT u.id, m.id, 'liked_songs', now() - (x.days_ago || ' days')::interval
FROM (VALUES
    ('s15', 1), ('s13', 2), ('s5',  3), ('s30', 4), ('s16', 5),
    ('s2',  6), ('s14', 7), ('s1',  8), ('s22', 9)
  ) AS x(legacy_id, days_ago)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

-- Saved sermons live in the same table under a different collection — the UI keeps them as a
-- separate shelf, so the distinction has to survive the round trip.
INSERT INTO user_likes (user_id, media_item_id, collection, created_at)
SELECT u.id, m.id, 'saved_sermons', now() - (x.days_ago || ' days')::interval
FROM (VALUES ('ser1', 2), ('ser2', 5)) AS x(legacy_id, days_ago)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

INSERT INTO user_follows_artist (user_id, artist_id, created_at)
SELECT u.id, a.id, now() - (x.days_ago || ' days')::interval
FROM (VALUES
    ('COSACOW Nairobi', 3),
    ('Oakwood University Aeolians', 9),
    ('Maxwell SDA Church Choir, Nairobi', 14)
  ) AS x(name, days_ago)
JOIN artists a ON a.name = x.name
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

INSERT INTO user_follows_playlist (user_id, playlist_id, created_at)
SELECT u.id, p.id, now() - (x.days_ago || ' days')::interval
FROM (VALUES ('p1', 6), ('p5', 11)) AS x(legacy_id, days_ago)
JOIN playlists p ON p.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

-- Two playlists the account owns. is_curated stays FALSE: playlists_curated_has_no_owner
-- refuses a curated playlist with an owner.
INSERT INTO playlists (id, owner_id, title, description, cover_url, is_curated, is_public, created_at)
SELECT x.id::uuid, u.id, x.title, x.description, x.cover_url, FALSE, x.is_public,
       now() - (x.days_ago || ' days')::interval
FROM (VALUES
    ('b0000000-0000-4000-8000-000000000001', 'Sabbath Drive',
     'Hymns and choir for the road to church.',
     'https://picsum.photos/seed/u-sabbath-drive/400/400', TRUE, 21),
    ('b0000000-0000-4000-8000-000000000002', 'Kenyan Choir Favourites',
     'The Swahili and Kenyan recordings I keep coming back to.',
     'https://picsum.photos/seed/u-kenyan-choir/400/400', TRUE, 9)
  ) AS x(id, title, description, cover_url, is_public, days_ago)
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT (id) DO NOTHING;

INSERT INTO playlist_items (playlist_id, media_item_id, position, added_at, added_by)
SELECT 'b0000000-0000-4000-8000-000000000001', m.id, x.position,
       now() - interval '21 days', u.id
FROM (VALUES ('s1', 0), ('s5', 1), ('s2', 2), ('s3', 3), ('s11', 4)) AS x(legacy_id, position)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

INSERT INTO playlist_items (playlist_id, media_item_id, position, added_at, added_by)
SELECT 'b0000000-0000-4000-8000-000000000002', m.id, x.position,
       now() - interval '9 days', u.id
FROM (VALUES
    ('s15', 0), ('s13', 1), ('s14', 2), ('s16', 3), ('s17', 4), ('s18', 5), ('s30', 6)
  ) AS x(legacy_id, position)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT DO NOTHING;

-- Listening history, spread across the three windows the ListeningHistory page groups by
-- (today / yesterday / earlier this week) so all three sections render.
--
-- ms_played is above the counting threshold on every row — 30s, or half the item. The server
-- only writes history for plays that count, so a row below it could not have got here.
INSERT INTO listening_history (user_id, media_item_id, played_at, ms_played, completed, device)
SELECT u.id, m.id, now() - x.ago::interval, x.ms_played, x.completed, 'web'
FROM (VALUES
    -- today
    ('s15',  '1 hours',         302000, TRUE),
    ('s13',  '3 hours',         268000, TRUE),
    ('s16',  '6 hours',          95000, FALSE),
    -- yesterday
    ('s5',   '1 days 4 hours',  356000, TRUE),
    ('s30',  '1 days 7 hours',  241000, TRUE),
    ('s2',   '1 days 9 hours',   48000, FALSE),
    -- earlier this week
    ('s14',  '3 days',          277000, TRUE),
    ('s1',   '4 days',          245000, TRUE),
    ('ser1', '5 days',         1380000, FALSE),
    ('s22',  '6 days',          199000, TRUE)
  ) AS x(legacy_id, ago, ms_played, completed)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT ON CONSTRAINT listening_history_user_item_unique DO NOTHING;

-- Somewhere to resume from, so the player is not empty on first load. queue holds ids only,
-- never denormalised objects (plan §1 day 1, open question 3).
INSERT INTO player_state (user_id, media_item_id, position_ms, queue, ordered_queue,
                          current_index, shuffle, repeat_mode, volume)
SELECT
  u.id,
  (SELECT id FROM media_items WHERE legacy_id = 's15'),
  62000,
  (SELECT jsonb_agg(m.id::text ORDER BY q.position)
     FROM (VALUES ('s15', 0), ('s13', 1), ('s16', 2), ('s14', 3), ('s30', 4)) AS q(legacy_id, position)
     JOIN media_items m ON m.legacy_id = q.legacy_id),
  NULL, 0, FALSE, 'off', 0.85
FROM users u WHERE u.external_auth_id = 'dev|listener@adventwave.app'
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- pastor@adventwave.app — speech-heavy, and private
-- ---------------------------------------------------------------------------

INSERT INTO user_likes (user_id, media_item_id, collection, created_at)
SELECT u.id, m.id, 'saved_sermons', now() - (x.days_ago || ' days')::interval
FROM (VALUES ('ser1', 1), ('ser2', 3), ('ser3', 8)) AS x(legacy_id, days_ago)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|pastor@adventwave.app'
ON CONFLICT DO NOTHING;

-- Podcasts are not sermons, so they land in liked_songs — the collection column separates the
-- two shelves the UI shows, and there is no third shelf for episodes.
INSERT INTO user_likes (user_id, media_item_id, collection, created_at)
SELECT u.id, m.id, 'liked_songs', now() - (x.days_ago || ' days')::interval
FROM (VALUES ('ep1', 2), ('ep3', 6)) AS x(legacy_id, days_ago)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|pastor@adventwave.app'
ON CONFLICT DO NOTHING;

INSERT INTO user_follows_artist (user_id, artist_id, created_at)
SELECT u.id, a.id, now() - (x.days_ago || ' days')::interval
FROM (VALUES
    ('Pastor Dwight Nelson', 4),
    ('Adventist World Radio', 12)
  ) AS x(name, days_ago)
JOIN artists a ON a.name = x.name
JOIN users u ON u.external_auth_id = 'dev|pastor@adventwave.app'
ON CONFLICT DO NOTHING;

INSERT INTO playlists (id, owner_id, title, description, cover_url, is_curated, is_public, created_at)
SELECT 'b0000000-0000-4000-8000-000000000003', u.id, 'Sermon Prep',
       'Messages to revisit before writing.',
       'https://picsum.photos/seed/u-sermon-prep/400/400', FALSE, FALSE, now() - interval '30 days'
FROM users u WHERE u.external_auth_id = 'dev|pastor@adventwave.app'
ON CONFLICT (id) DO NOTHING;

INSERT INTO playlist_items (playlist_id, media_item_id, position, added_at, added_by)
SELECT 'b0000000-0000-4000-8000-000000000003', m.id, x.position,
       now() - interval '30 days', u.id
FROM (VALUES ('ser1', 0), ('ser2', 1), ('ser3', 2), ('ep2', 3)) AS x(legacy_id, position)
JOIN media_items m ON m.legacy_id = x.legacy_id
JOIN users u ON u.external_auth_id = 'dev|pastor@adventwave.app'
ON CONFLICT DO NOTHING;

-- No listening_history and no player_state for this account, on purpose. private_session is
-- on, so nothing it plays may ever be recorded; seeding history here would contradict the
-- rule the account exists to demonstrate.

-- ---------------------------------------------------------------------------
-- newuser@adventwave.app — nothing beyond settings, on purpose.
--
-- The cold-start path has to keep working: the content-based recommender is the only one that
-- can function before a user has any history (plan §8 risk register), and every page needs a
-- sensible empty state. This account is how that gets exercised without clearing a database.
-- ---------------------------------------------------------------------------
