# AdventWave Backend — Execution Plan

**Status:** Pre-Week-0. Nothing server-side exists yet.
**Target:** Integrated first build in 8 weeks + Week 0, 10 engineers, 6 workstreams.
**Architecture:** As specified — Postgres, Redis, Kafka, Cassandra, Elasticsearch, gRPC
services, Kubernetes, Spark offline pipeline, object storage + CDN.
**Primary language:** Java (LTS) + Spring Boot for services A/B/C; Python for F; Go or Python
for D; TypeScript for the clients. See §1 pre-work.

---

## 0. Where we start

**Week 0, day 1: the contract lock.** Nothing else begins until contracts are frozen.

One correction to the Week 0 scope as originally written: it assumes we extend "the Postgres
schema in the current scaffold." There is no scaffold. The repo is a Vite + React frontend
with mock data — no SQL, no protos, no infra. So Week 0 is not a half-day extension exercise;
it is a **5-day, whole-team design sprint** that produces the data model from scratch.

The good news: **the contracts are already latent in the frontend code.** The Zustand stores
define the user-state model, `mockData.js` defines the catalog model, and the 16 pages define
the API surface. We are not designing in the dark — we are formalising what the client already
depends on. That is what Week 0 does, and it is why it can be done in five days rather than
three weeks.

**Day-zero rule:** every workstream's first commit is a *consumer* of the contracts repo, never
a definer of its own types.

---

## 1. Week 0 — Contract Lock (5 days, whole team)

### Pre-work (do before day 1)

Decisions that block everything and should be made by the tech lead, not workshopped. The
bottom two are already settled; the top four are outstanding.

| Decision | Recommendation | Why it blocks |
| --- | --- | --- |
| Cloud provider | One of AWS / GCP — pick today | Determines EKS vs GKE, MSK vs Confluent, S3 vs GCS |
| Managed vs self-hosted Kafka | Managed (MSK / Confluent Cloud) | Self-hosting Kafka costs workstream C its entire first two weeks |
| Managed vs self-hosted Cassandra | Managed (Astra / Keyspaces) or ScyllaDB Cloud | Same reason |
| Identity | Managed IdP (Cognito / Auth0 / Clerk) issuing JWTs, our service does authorization only | Frees ~1 engineer-month in workstream A and removes the highest-severity security surface |
| **Language — DECIDED** | **Java LTS + Spring Boot** for A/B/C | Every heavyweight component here (Kafka, Cassandra, Elasticsearch, Spark) is JVM-native; clients are reference implementations. Pin the exact Java and Spring Boot versions on day 5. |
| **Cache — DECIDED** | **Managed Redis** (ElastiCache / Memorystore / Redis Cloud) | Cross-cutting; needs a key-namespace contract before any workstream writes a key |

**Language allocation.** The stack is deliberately polyglot; the gRPC contracts are what keep
it coherent.

| WS | Language | Stack |
| --- | --- | --- |
| A | Java LTS | Spring Boot, Spring Security (validates IdP JWTs), jOOQ or JPA, Flyway, Lettuce/Redisson |
| B | Java LTS | Spring Boot, official Elasticsearch Java client |
| C | Java LTS + config | **Debezium** on Kafka Connect for the outbox; DataStax Java driver for the Cassandra writer |
| D | Go or Python | ffmpeg orchestration + object-storage SDK — Java is heavier than this job needs |
| E | Terraform + YAML | Not application code |
| F | Python | FastAPI serving, PySpark offline |
| G | TypeScript | Existing React web + Expo mobile |

Two Java-specific wins to exploit rather than rebuild:

- **Debezium replaces workstream C's hand-rolled outbox poller.** It is the JVM-native CDC tool
  built for exactly this transactional-outbox pattern — reads the Postgres WAL, publishes to
  Kafka, handles restart/offset/ordering. Configuration instead of crash-safe polling code we
  have to write and prove ourselves. This removes C's single riskiest deliverable.
- **Virtual threads.** The gateway is I/O fan-out (catalog + library + reco → assemble a home
  page). That is the workload virtual threads exist for, without going reactive.

Also stand up: the contracts repo, a shared Slack/Discord channel per workstream, and a single
integration-status board visible to all 10 engineers.

### Day 1 — Domain model → Postgres schema

Whole team, facilitated. Output is DDL checked into `contracts/postgres/`.

**Key finding to decide on first:** in `mockData.js`, `songs`, `sermonTracks` and
`podcastEpisodes` have **identical shapes** — `{ id, title, artist, album, duration, cover,
audioUrl }`. They differ only in semantics. Recommend a single `media_items` table with a
`media_type` discriminator rather than three parallel catalogs. This decision cascades into
the search index, the event schema, and the recommendation features — make it on day 1, not
week 3.

Starting DDL (extend, don't restart):

```sql
-- Identity & access
users              (id, external_auth_id, email, display_name, region, created_at)
user_settings      (user_id PK, theme, private_session, normalize_audio,
                    crossfade_enabled, sidebar_collapsed, friend_activity_collapsed)

-- Contributors
churches           (id, name, country, region, contact_email, consent_status, created_at)
artists            (id, name, slug, cover_url, bio, church_id FK, verified, created_at)
albums             (id, title, artist_id FK, cover_url, release_date)

-- Catalog (unified)
media_items        (id, media_type ENUM('song','sermon','podcast'), title,
                    artist_id FK, album_id FK, duration_ms, cover_url,
                    genre, language, region, popularity SMALLINT,
                    status ENUM('draft','processing','published','withdrawn','failed'),
                    license_id FK, published_at, created_at,
                    -- loudness is a property of the recording, measured once
                    -- from the master; it applies to every derivative (§11.3)
                    loudness_lufs NUMERIC(5,2), true_peak_dbfs NUMERIC(5,2),
                    master_storage_key TEXT)
media_assets       (id, media_item_id FK, profile,        -- 'aac_96' etc, see §11.2
                    codec, bitrate_kbps, container, sample_rate_hz, channels,
                    storage_key, byte_size, checksum_sha256, created_at,
                    UNIQUE (media_item_id, profile))      -- one row per transcode output

-- Licensing (gates publication)
licenses           (id, church_id FK, consent_status, consent_document_url,
                    territory, granted_at, expires_at, revenue_share_pct)

-- Curation & user library
playlists          (id, owner_id FK NULL, title, description, cover_url,
                    is_curated, is_public, created_at)
playlist_items     (playlist_id FK, media_item_id FK, position, added_at, added_by)
user_likes         (user_id FK, media_item_id FK, created_at)   -- covers likedSongIds
                                                                 -- and savedSermonIds
user_follows_artist   (user_id FK, artist_id FK, created_at)
user_follows_playlist (user_id FK, playlist_id FK, created_at)

-- Cross-device playback resume
player_state       (user_id PK, media_item_id, position_ms, queue JSONB,
                    ordered_queue JSONB, shuffle, repeat, volume, updated_at)

-- Presentation
discover_categories (id, label, gradient, cover_url, sort_order)

-- The seam workstream C depends on
outbox             (id BIGSERIAL, aggregate_type, aggregate_id, event_type,
                    payload JSONB, created_at, published_at NULL)
```

Open questions to resolve in the room, not later:
- `likedSongIds` and `savedSermonIds` are separate arrays in `useLibraryStore`. Does a unified
  `user_likes` table preserve the UI distinction, or do we need a `collection` column?
- `followedArtistNames` stores **names**, not IDs. Artist identity must be resolved during
  migration — decide the canonical key now.
- Does `player_state.queue` store IDs or denormalised objects? (IDs. Confirm and write it down.)

**Exit criteria:** DDL applies cleanly to a local Postgres; every field the 16 frontend pages
read has a home; migration tool chosen (Flyway/Atlas/Alembic — one, for everyone).

### Day 2 — Kafka topics & event schemas

Output: `contracts/kafka/` with versioned JSON Schema or Avro, plus a topic registry.

```
catalog.media.v1        compacted, key=media_item_id     producer: A/B  → B, F
catalog.artist.v1       compacted, key=artist_id         producer: A    → B, F
catalog.playlist.v1     compacted, key=playlist_id       producer: A    → B, F
playback.events.v1      key=user_id, 30d retention       producer: gateway → C, F
library.events.v1       key=user_id                      producer: A    → F
audio.transcode.v1      key=media_item_id                producer: D    → A
```

**The single most important definition in Week 0 — what counts as a play:**

> A play is counted when `ms_played >= 30_000` OR `ms_played >= duration_ms * 0.5`,
> whichever comes first. Below that threshold the event is emitted but flagged
> `counted = false`.

This is not a schema detail. It determines what we report back to contributing churches, which
is a licensing and trust obligation. Decide it in the room and write it into the schema doc.

```jsonc
// playback.events.v1
{
  "event_id":      "uuid",        // idempotency key
  "user_id":       "uuid",
  "media_item_id": "uuid",
  "media_type":    "song|sermon|podcast",
  "session_id":    "uuid",
  "event_type":    "play_started|play_progress|play_completed|skipped",
  "ms_played":     0,
  "duration_ms":   0,
  "counted":       false,
  "private":       false,         // MUST be honoured — see below
  "device":        "web|ios|android",
  "client_ts":     "iso8601",
  "server_ts":     "iso8601"
}
```

**`private_session` is a hard requirement, not a nice-to-have.** `useUiStore` already exposes
a private-session toggle. Events with `private: true` must be excluded from listening history,
from recommendation features, and from the friend-activity feed. Workstreams C and F both
enforce it; it is a contract-conformance test, not a code review comment.

**Exit criteria:** every topic has a named producer and named consumers; schema registry
running; compatibility mode set to `BACKWARD`; example payloads committed.

### Day 3 — gRPC service contracts

Output: `contracts/proto/` + generated clients published to an internal package registry.

```
identity.v1        ValidateToken, GetUser, GetUserSettings, UpdateUserSettings
catalog.v1         GetMediaItem, BatchGetMediaItems, ListByArtist, ListByAlbum,
                   GetPlaylist, ResolvePlaylist, ListDiscoverCategories
library.v1         GetLibrary, ToggleLike, ToggleFollowArtist, ToggleFollowPlaylist,
                   CreatePlaylist, AddToPlaylist, GetPlayerState, SavePlayerState
search.v1          Search(query, filters) -> SearchResults
recommendation.v1  GetRecommendations(user_id) -> {recommended_songs,
                   recommended_playlists, because_you_listened, trending_in_region}
media.v1           RequestTranscode, GetAssetManifest, MintPlaybackUrl
```

`search.v1.SearchResults` must mirror `searchCatalogFull()`'s existing return shape —
`{ songs, sermons, podcasts, artists, albums, playlists, topResult }` — because the
`SearchResults` page already renders exactly that.

`recommendation.v1` must mirror `getRecommendations()`'s existing return shape for the same
reason. **Port the existing content-based recommender as the v1 implementation.** It works,
it handles cold start, and it is the only recommender that can function before we have users.
Spark-based collaborative filtering becomes v2 behind the same interface.

**Exit criteria:** protos compile; generated clients published; every service can import its
dependencies' stubs without those services existing.

### Day 4 — Cassandra schema + Redis keyspaces + OpenAPI gateway spec

Cassandra (`contracts/cassandra/`) — query-first design:

```cql
CREATE TABLE listening_history_by_user (
  user_id uuid, played_at timestamp, media_item_id uuid,
  media_type text, ms_played int, completed boolean, session_id uuid, device text,
  PRIMARY KEY ((user_id), played_at)
) WITH CLUSTERING ORDER BY (played_at DESC);

CREATE TABLE play_counts_by_item_day (
  media_item_id uuid, day date, plays counter,
  PRIMARY KEY ((media_item_id), day)
);

CREATE TABLE play_counts_by_artist_day (
  artist_id uuid, day date, plays counter,
  PRIMARY KEY ((artist_id), day)
);
```

Note the `ListeningHistory` page and `useLibraryStore` cap recent history at 100 entries —
set a TTL and a read limit accordingly rather than unbounded partitions.

**Redis key-namespace registry** (`contracts/redis/keyspaces.md`). Six workstreams sharing one
Redis without a registry is a guaranteed collision. Every key is `{ws}:{purpose}:{id}` with a
declared TTL and a declared owner:

| Key pattern | Owner | TTL | Purpose |
| --- | --- | --- | --- |
| `a:player:{user_id}` | A | 24h, flushed to PG every 30s | Player-state write buffer — the worst write pattern in the system if it hits Postgres directly |
| `a:home:{segment}` | A | 5m | Assembled `/v1/home` response |
| `a:ratelimit:{user_id}:{route}` | A | 1m | Token bucket, esp. `/v1/events/playback` |
| `a:friendfeed:{user_id}` | A | 10m | Backs the existing `FriendActivityPanel` |
| `b:media:{media_item_id}` | B | 1h + event-invalidated | Catalog read cache |
| `b:typeahead:{query_prefix}` | B | 15m | In front of Elasticsearch |
| `c:trending:{region}:{day}` | C | 48h | Sorted set; serves live counts while Cassandra holds durable ones |
| `f:reco:{user_id}` | F | 6h | Precomputed recommendations — what makes the Spark pipeline viable at serving latency |
| `d:playsession:{session_id}` | D | 15m | Signed-URL / playback session tracking |

**Two guardrails, enforced in CI, not code review:**

1. **Redis is a cache and ephemeral state — never a source of truth.** Every key must be
   reconstructible from Postgres or Cassandra. If flushing Redis loses data, the design is
   wrong. The single deliberate exception is `a:player:*`, which requires a documented flush
   guarantee and an explicitly bounded loss window (recommend ≤30s of playback position).
2. **Invalidation rides the existing Kafka contracts.** `catalog.*` is already compacted and
   specified — cache invalidation is a consumer of those topics, not a new mechanism. No
   workstream invents its own invalidation path.

OpenAPI (`contracts/openapi/adventwave.yaml`) — the public surface, derived from the 16 pages:

```
POST   /v1/auth/session            GET  /v1/me
GET    /v1/home                    GET  /v1/discover
GET    /v1/browse                  GET  /v1/search?q=
GET    /v1/media/{id}              GET  /v1/media/{id}/stream   -> signed URL
GET    /v1/artists/{id}            GET  /v1/albums/{id}
GET    /v1/playlists/{id}          POST /v1/playlists
PUT    /v1/playlists/{id}/items    GET  /v1/library
PUT    /v1/library/likes/{id}      PUT  /v1/library/follows/artist/{id}
GET    /v1/history                 DELETE /v1/history
GET    /v1/recommendations         GET/PUT /v1/player-state
POST   /v1/events/playback         GET/PUT /v1/settings
```

**`/v1/media/{id}/stream` returns a short-lived signed CDN URL, never a permanent public link.**
The catalog is church-licensed content; permanent public URLs make it trivially scrapeable and
put the consent agreements at risk.

**Exit criteria:** spec validates; mock server (Prism/WireMock) runs from it so the frontend
workstream can start immediately.

### Day 5 — Freeze, tooling, and scaffolding

- Tag `contracts@v1.0.0`. **Changes after this require a written RFC + tech lead approval.**
- Stand up the contract-conformance CI harness (§4) so it exists before any service code does.
- Scaffold all repos/packages with CI wired and a hello-world service deploying.
- Every workstream writes its `CLAUDE.md` (§5).
- Publish the mock server so workstreams can develop against contracts on day 1 of week 1.

**Week 0 go/no-go:** if contracts are not frozen by Friday, week 1 does not start. Slipping
the freeze is far cheaper than 10 engineers building against a moving target.

---

## 2. Repo topology

```
adventwave-contracts/          # THE source of truth — versioned, tagged, no service code
  postgres/  cassandra/  kafka/  proto/  openapi/  examples/

adventwave-platform/     (A)   identity, gateway, user, playlist, church, artist
adventwave-catalog/      (B)   catalog service + ES indexer
adventwave-events/       (C)   outbox poller, Kafka producers, Cassandra writer
adventwave-audio/        (D)   transcoder, upload/admin portal
adventwave-infra/        (E)   Terraform, Helm charts, CI templates, dashboards
adventwave-reco/         (F)   recommendation service + Spark jobs
advent-wave/             (G)   existing web client — API migration
advent/                  (G)   Expo mobile client
```

Contracts are consumed as a pinned dependency (git submodule or versioned package). A service
may never vendor or fork a contract file.

---

## 3. Workstream charters

Original split, with the two tracks that were unassigned now staffed. The 6 workstreams sum to
all 10 engineers, so **G and H need resourcing** — either headcount 11–12, or pull from A and F
in weeks 1–2 when both are lightest.

| WS | Eng | Owns | Hard dependencies |
| --- | --- | --- | --- |
| **A** Platform core | 2 | Postgres, gateway, identity, user/playlist/church/artist, **outbox writes** | Managed IdP |
| **B** Catalog & search | 1.5 | Catalog service, ES cluster, indexing pipeline | A's schema; `catalog.*` topics |
| **C** Event pipeline | 2 | Kafka, **Debezium outbox pipeline**, Cassandra + write path, trending counters | A's outbox table |
| **D** Audio pipeline | 1.5 | Transcoding, object storage, CDN, signed URLs, upload portal | **None — start immediately** |
| **E** Platform/infra | 1.5 | K8s, CI/CD, observability, secrets, **provisions managed Redis** (each WS owns its own keyspace) | None |
| **F** Recommendation/ML | 1.5 | Reco service, Spark offline pipeline | Ports existing recommender first |
| **G** Client migration | **2 (new)** | Web + mobile API integration, cache→server state | OpenAPI mock server only |
| **H** Licensing & content | **1 + non-eng (new)** | Church outreach, consent, dataset ingestion | **Starts Week 0** |

### Why H starts in Week 0, not Week 7

The plan schedules the real dataset migration and licensing review for weeks 7–8. That is the
critical path, and it is currently last. **If consent is not secured, weeks 1–8 of backend work
ship nothing.** No `media_item` may reach `status = 'published'` without a `licenses` row in
`consent_status = 'granted'` — enforce it as a database constraint, not a process.

H runs the full 9 weeks in parallel: outreach and consent forms weeks 0–3, master file
collection weeks 3–5, metadata normalisation weeks 5–6, ingestion weeks 6–7, review week 8.

### Why D starts on day 1

D has no upstream dependencies and owns the longest-lead-time work (transcoding pipeline, CDN,
storage). It is also the only thing standing between us and playable audio. It should be the
first workstream unblocked and the first to demo.

---

## 4. Weeks 1–8

### Weeks 1–2 — Build in isolation against contracts

| WS | Deliverable | Exit criterion |
| --- | --- | --- |
| A | Schema deployed; IdP integrated; CRUD for user/playlist/artist/church; **outbox rows written in the same transaction as domain writes** | Outbox row appears atomically with the write it describes — proven by a rollback test |
| B | Catalog service on Postgres; ES cluster up; indexer stubbed; **`isKenyaQuery` boost logic ported** | `search.v1` returns correct shape from real Postgres data |
| C | Kafka + schema registry live; **Debezium** connector publishing A's real outbox table; Cassandra deployed | Connector survives restart with no dupes and no gaps (idempotency by `event_id`) |
| D | Storage + CDN provisioned; transcoder: one file in → multiple bitrates out; **signed-URL minting** | A file uploaded manually is playable via a signed URL that expires |
| E | Managed K8s live; per-service CI/CD; observability template on one service; **managed Redis provisioned with keyspaces from the registry** | Any workstream can copy the template and get logs/metrics/traces in <1 day |
| F | Reco service skeleton; **existing `getRecommendations` ported behind `recommendation.v1`** | Returns real recommendations from real catalog + mocked events |
| G | Client API layer + mock server; auth flow; **`RequireAuth` on real JWTs** | Web app runs fully against the mock server with zero `mockData.js` imports on 3 pages |
| H | Church outreach begun; consent template legally reviewed | 10+ churches contacted; consent form finalised |

**Checkpoint (end of week 2):** every workstream demos against contracts. Any contract drift
discovered here is cheap; the same drift found in week 5 is not.

### Weeks 3–4 — Wire real integrations

- C's poller consumes A's real outbox; Cassandra writer persists real history rows
- B's indexer consumes `catalog.*` from Kafka (**not** a batch script — the batch path becomes
  permanent if we allow it)
- F's Spark pipeline reads real `playback.events.v1`
- D's transcoder wired to the real upload flow; submission portal usable by workstream H
- E deploys all services to a **shared staging cluster** — this is the week that matters
- G migrates remaining pages off mock data; mobile client begins integration
- H begins collecting master audio files

**This is the phase that slips.** Budget for it explicitly. Nominate one engineer as
integration owner with authority to block merges that break staging.

**Checkpoint (end of week 4):** one full trace exists — upload → transcode → catalog →
Kafka → ES → search result → playback → play event → Kafka → Cassandra → recommendation
input — visible as a single distributed trace in the observability stack. **If you cannot see
that trace end-to-end, weeks 5–6 do not start.**

### Weeks 5–6 — Cross-service testing & hardening

Non-skippable trigger conditions:

1. **End-to-end flows** across all teams, automated in CI against staging.
2. **Load testing** — each service independently, then integrated. Establish real numbers for
   Kafka lag under load, Cassandra p99 write latency, ES query p99, CDN cache hit rate.
3. **Security pass** — auth flows, secrets management, input validation at every boundary,
   signed-URL expiry, rate limiting on `/v1/events/playback` (it is unauthenticated-adjacent
   and trivially floodable).
4. **Privacy conformance** — automated test proving `private: true` events reach neither
   Cassandra history nor F's feature store.
5. **Observability review** — the real test: take a deliberately broken cross-service flow and
   have an engineer who did not build it diagnose it from dashboards alone, timed.
6. **Failure drills** — kill a Cassandra node, stall a Kafka consumer, expire a CDN cert.
   Write down what broke and what the dashboards showed.

### Weeks 7–8 — Real data & soft launch

- H's church-sourced dataset migrated, replacing all seed data
- **Licensing review: every published item verified against its consent record.** Nothing goes
  public without it.
- Runbooks written and rehearsed: Kafka lag spike, unhealthy Cassandra node, CDN cache-hit
  degradation, ES index corruption, transcoding backlog, IdP outage
- On-call rota established with a real escalation path
- Soft launch to a small, known user group
- **Reserve week 8 for schema/config revision from real traffic.** Integrated build complete
  is not done.

---

## 5. Contract-conformance CI (built in Week 0, day 5)

Every service repo runs on every commit:

1. **Schema conformance** — service DTOs validated against `contracts@` protos/OpenAPI; drift fails the build
2. **Event conformance** — every produced event validated against its registered schema
3. **Consumer-driven contract tests** (Pact or equivalent) — consumers publish expectations; producers verify them
4. **Migration linting** — no destructive Postgres migration without an explicit approval label
5. **Privacy assertion** — the `private_session` test runs in every pipeline that touches events

This is what makes agent-assisted parallel work safe: an agent-generated change that violates
a contract fails in CI, not in week 5 integration.

---

## 6. Agentic tooling per workstream

Each workstream gets a `CLAUDE.md` at its repo root containing:

- **Service responsibility** in two sentences, and an explicit list of what it must *not* do
- **Contract pointers** — paths into `adventwave-contracts`, with "these files are read-only"
- **Upstream/downstream map** — which services it calls, which call it, which topics it
  produces and consumes
- **Local dev loop** — how to run against the mock server without other services present
- **Invariants** — e.g. for A: *"every domain write that changes catalog or library state
  must write an outbox row in the same transaction"*; for C: *"consumers must be idempotent
  on `event_id`"*; for D: *"never return an unsigned media URL"*
- **The privacy rule**, verbatim, in every workstream that touches events

Scope each agent to one repo. An agent with visibility into all six services will reconcile
contract ambiguity by inventing a seventh interpretation.

---

## 7. Coordination for 10 engineers

| Cadence | Forum | Purpose |
| --- | --- | --- |
| Daily, 10 min | Per-workstream standup | Local blockers |
| 2×/week, 20 min | Integration sync — one rep per workstream | Cross-stream blockers only |
| Weekly | Contract review board | RFCs against frozen contracts; the only path to a contract change |
| End of each phase | Demo day | Every workstream demos against real dependencies |

**Contract change protocol:** RFC → impacted workstreams sign off → version bump → consumers
migrate within one week → old version deleted. Never edit a frozen contract in place.

---

## 8. Risk register

| Risk | Severity | Mitigation | Owner |
| --- | --- | --- | --- |
| Church consent not secured | **Critical — blocks launch entirely** | H starts Week 0; DB constraint prevents publishing unlicensed items | H |
| Weeks 3–4 integration slips 2–4× | High | Named integration owner; week-4 trace gate; staging from week 3 | Tech lead |
| Contract drift discovered late | High | Conformance CI from day 5; end-of-week-2 demo | All |
| Self-hosting Kafka/Cassandra eats weeks 1–2 | High | Managed services — decided in pre-work | C, E |
| Client migration unstaffed | High | G staffed explicitly; 2 clients, not 1 | G |
| Cold-start recommendations have no training data | Medium | Content-based recommender is v1; Spark CF is v2 | F |
| Catalog scraped via public URLs | Medium | Signed URLs only, enforced in `media.v1` | D |
| Infra idle cost before launch | Medium | ~$1.5–3k/month for Kafka+Cassandra+ES+Spark+K8s — budget it now | E |
| Private-session leak into history/reco | Medium — trust and legal | Automated conformance test in C and F pipelines | C, F |
| Redis drifts into being a source of truth | Medium | CI assertion: flushing Redis in staging must not fail any E2E test (except the documented `a:player:*` window) | E + all |
| Cache stampede on `/v1/home` or `f:reco:*` | Medium | Request coalescing + jittered TTLs; load-test with a cold cache in week 5 | A, F |
| Team unfamiliar with Spring Boot / JVM ops | Medium — depends on hiring | Confirm before Week 0 ends; if thin, keep Java only for C where Debezium and the Cassandra driver make it non-negotiable | Tech lead |

---

## 9. Go/no-go gates

Each gate is binary. Do not proceed past a red gate.

- **G0 — end of Week 0:** contracts tagged `v1.0.0`; mock server live; conformance CI running
- **G1 — end of Week 2:** every workstream demos against contracts; zero unresolved drift
- **G2 — end of Week 4:** full end-to-end distributed trace visible in staging
- **G3 — end of Week 6:** load numbers recorded; security pass complete; failure drills run;
  a non-author diagnosed a broken flow from dashboards
- **G4 — end of Week 8:** every published item has a granted licence; runbooks rehearsed;
  on-call staffed → soft launch

---

## 10. Immediate next actions

1. Tech lead closes the remaining pre-work decisions — cloud, managed Kafka, managed
   Cassandra, IdP. Language and cache are already decided (Java + Spring Boot, managed Redis).
2. Create `adventwave-contracts`; book the Week 0 sprint; block all 10 calendars
3. Start workstream H outreach **now** — it has the longest lead time and gates launch
4. Unblock workstream D immediately — no dependencies, longest technical lead time, and §11
   gives it a day-1 spec
5. Resource G and H, or accept that the clients and the content do not get built
6. Settle the Spring Boot familiarity question (§8 risk register) before Week 0 ends

---

## 11. Appendix — Workstream D: audio encoding & transcoding

Owner: **D**. No upstream dependencies — this is buildable from day 1 of Week 1, before A's
schema is deployed. Everything here is a Week 0 contract commitment; changes follow §7's RFC
process.

### 11.1 Masters vs derivatives

Two file classes, two buckets, two lifecycles:

| Class | What | Bucket | Lifecycle | Served? |
| --- | --- | --- | --- | --- |
| **Master** | Contributor's original — WAV/FLAC, ~1411 kbps | `adventwave-masters` | → archive tier after 30d | **Never** |
| **Derivative** | Encoded playback files | `adventwave-derived` | Hot, CDN origin | Yes, signed URLs only |

**Masters must be lossless — this is a contributor-guideline requirement, not a preference.**
Encoding is always `compressed → raw PCM → compressed`; there is no direct path between two
lossy formats. So encoding a contributor's MP3 to AAC stacks a second encoder's artifacts on
the first, and the second encoder spends its bit budget faithfully reproducing the first one's
damage. Workstream H asks churches for **WAV or FLAC**; the upload portal accepts MP3 but
**flags it for review** rather than silently ingesting it.

Masters are the archive of record. If we change codec or ladder in two years, every derivative
is re-derived from masters — so masters are never deleted and never overwritten.

### 11.2 Bitrate ladders

**The ladder varies by `media_type`.** Encoding a 45-minute sermon at 320 kbps is waste; speech
is transparent at 96k AAC. Your mock sermons run 43 min and podcasts 37 min, so this is not a
rounding error — it roughly halves storage and CDN egress on long-form content.

`ladder = music_v1` (`media_type = 'song'`):

| Profile ID | Bitrate | Codec | Tier | Notes |
| --- | --- | --- | --- | --- |
| `aac_24_hev2` | 24 kbps | HE-AACv2 | Data Saver | See the licensing note below |
| `aac_96` | 96 kbps | AAC-LC | Normal | Default for unauthenticated/free |
| `aac_160` | 160 kbps | AAC-LC | High | Default for signed-in |
| `aac_320` | 320 kbps | AAC-LC | Very High | Premium tier when we have one |

`ladder = speech_v1` (`media_type` in `'sermon','podcast'`):

| Profile ID | Bitrate | Codec | Tier |
| --- | --- | --- | --- |
| `aac_24_hev2` | 24 kbps | HE-AACv2 | Data Saver |
| `aac_64` | 64 kbps | AAC-LC | Normal |
| `aac_128` | 128 kbps | AAC-LC | High |

**Container:** M4A (MP4 audio) with `+faststart` so the moov atom is at the head and playback
starts before the full file arrives.

**Why AAC and not Ogg Vorbis.** Spotify chose Vorbis in 2008 under different licensing
conditions. AAC gets **hardware decoding** on every iOS and Android device — materially less
battery drain during playback — and is natively supported by `expo-av` and every browser. For a
web + Expo client pair, AAC is the lower-friction choice.

**The 24 kbps tier is a market requirement, not a nicety.** 18 of the 30 catalogue items are
tagged `region: 'kenya'`. A tier that streams over patchy 3G is load-bearing for the primary
market.

> **Licensing gotcha — resolve in Week 0, not Week 2.** HE-AACv2 requires `libfdk_aac`, which
> needs an ffmpeg built with `--enable-libfdk-aac --enable-nonfree`. That binary **cannot be
> redistributed**. Building it into our own internal container image is standard practice and
> fine; shipping it to third parties is not. If we want to avoid the non-free build entirely,
> the fallback is `aac_64` (AAC-LC) as the low tier — noticeably worse than 24k HE-AACv2 but
> workable. **D decides this in Week 0 and the ladder table above is updated accordingly.**

### 11.3 Loudness normalization

`useUiStore` already ships a `normalizeAudio` toggle, so this is a requirement, not an option.

**We do not re-encode to normalize.** At ingest we *measure* integrated loudness once from the
master and store it as metadata; the client applies gain at playback. Target: **-14 LUFS**
(Spotify's default).

```bash
# standalone analysis — integrated LUFS, loudness range, true peak.
# Useful for debugging a single file; the worker does NOT run this separately —
# measurement is folded into the encode pass (§11.4) so the master is decoded once.
ffmpeg -i master.wav -af ebur128=peak=true -f null - 2>&1 | tail -20
```

Persist to `media_items.loudness_lufs` and `media_items.true_peak_dbfs` (§1 day 1 DDL). The
server computes `gain_db = -14.0 - loudness_lufs` and returns it in the stream manifest.

This matters disproportionately for this catalogue: a studio-mastered hymn and a phone
recording of a Nairobi camp meeting can differ by 10+ dB. Without normalization users ride the
volume knob between tracks.

`crossfadeEnabled` in the same store is **client-side only** — it needs the next track
pre-buffered and involves no server work.

### 11.4 ffmpeg — one pass, all profiles

A single invocation decodes the master once and fans out to every profile **plus the loudness
measurement**. Separate jobs would decode the same 45-minute sermon five times over. We trade
retry granularity for a large CPU saving, which is the right call at this scale.

**Probe first — never hardcode channels or sample rate.** Two source properties must be carried
through rather than forced:

```bash
read -r CHANNELS SAMPLE_RATE < <(ffprobe -v error -select_streams a:0 \
  -show_entries stream=channels,sample_rate -of csv=p=0:s=' ' "$MASTER")

# Cap absurd master rates; otherwise preserve the source and skip a resample.
[ "$SAMPLE_RATE" -gt 48000 ] && SAMPLE_RATE=48000

# Parametric stereo is meaningless on a mono source — use HE-AACv1 instead.
if [ "$CHANNELS" -eq 1 ]; then LOW_PROFILE=aac_he; else LOW_PROFILE=aac_he_v2; fi
```

Then encode and measure in one pass:

```bash
ffmpeg -hide_banner -i "$MASTER" \
  -filter_complex "[0:a]asplit=5[a1][a2][a3][a4][meas]; \
                   [meas]ebur128=peak=true[nul]" \
  -map "[nul]" -f null - \
  -map "[a1]" -c:a libfdk_aac -profile:a "$LOW_PROFILE" -b:a 24k \
      -ar "$SAMPLE_RATE" -ac "$CHANNELS" -movflags +faststart "aac_24_hev2.m4a" \
  -map "[a2]" -c:a libfdk_aac -profile:a aac_low -b:a 96k \
      -ar "$SAMPLE_RATE" -ac "$CHANNELS" -movflags +faststart "aac_96.m4a" \
  -map "[a3]" -c:a libfdk_aac -profile:a aac_low -b:a 160k \
      -ar "$SAMPLE_RATE" -ac "$CHANNELS" -movflags +faststart "aac_160.m4a" \
  -map "[a4]" -c:a libfdk_aac -profile:a aac_low -b:a 320k \
      -ar "$SAMPLE_RATE" -ac "$CHANNELS" -movflags +faststart "aac_320.m4a"
```

`ebur128` writes integrated LUFS, loudness range and true peak to stderr; `-f null -` discards
its audio because only the measurement is wanted. Parse it from stderr, don't re-run it.

**Why channel preservation matters here specifically.** A large share of sermon and
camp-meeting recordings are mono. Forcing `-ac 2` upmixes them and spends double the bitrate
encoding two identical channels — on the longest content in the catalogue, where the bits cost
most. This is the single highest-value line in the command.

**Why `-movflags +faststart` is non-negotiable.** MP4 stores its index (the `moov` atom) at the
end of the file by default, because frame sizes aren't known until encoding finishes. A player
streaming over HTTP needs that index *before* it can start, so without faststart the client
stalls until the file is fetched. The flag costs one extra rewrite pass at encode time and is
the difference between instant playback and a multi-second delay.

Worker steps, in order: **probe** (duration, channels, sample rate) → **encode + measure**
(single pass, above) → **verify** (§11.7) → **waveform** (optional; `audiowaveform` JSON for
the scrubber UI) → **upload** → **emit completed event**.

### 11.5 Storage key layout

Deterministic keys make retries idempotent — a re-run overwrites identically, so a poison
message can never produce a half-published item.

```
s3://adventwave-masters/{media_item_id}/original.{ext}
s3://adventwave-derived/{media_item_id}/{profile}.m4a
s3://adventwave-derived/{media_item_id}/waveform.json
s3://adventwave-covers/{media_item_id}/{size}.webp
```

D also owns cover-art derivatives (the client currently requests 400×400; generate 160/400/800
WebP with a JPEG fallback).

### 11.6 `audio.transcode.v1` event schema

Registered in `contracts/kafka/` alongside the other Week 0 topics.

```jsonc
// key = media_item_id
// --- requested (producer: D upload service) ---
{
  "event_id":           "uuid",
  "media_item_id":      "uuid",
  "media_type":         "song|sermon|podcast",
  "master_storage_key": "masters/{media_item_id}/original.wav",
  "ladder":             "music_v1|speech_v1",
  "attempt":            1,
  "requested_at":       "iso8601"
}

// --- completed (producer: D transcode worker; consumer: A) ---
{
  "event_id":       "uuid",
  "media_item_id":  "uuid",
  "status":         "completed|failed",
  "duration_ms":    245000,
  "loudness_lufs":  -13.7,
  "true_peak_dbfs": -0.8,
  "assets": [
    { "profile": "aac_24_hev2", "codec": "he-aac-v2", "bitrate_kbps": 24,
      "container": "m4a", "sample_rate_hz": 44100, "channels": 2,
      "storage_key": "derived/{id}/aac_24_hev2.m4a",
      "byte_size": 734003, "checksum_sha256": "..." }
  ],
  "error":        null,
  "completed_at": "iso8601"
}
```

**A consumes `completed`** → writes `media_assets` rows + loudness fields → moves
`media_items.status` from `processing` to `published` — **only if the item's `licenses` row is
`consent_status = 'granted'`** (§3 workstream H). That check is a database constraint, not
application logic.

### 11.7 Runtime behaviour

| Concern | Decision |
| --- | --- |
| Upload path | Presigned PUT direct to S3. A 200 MB WAV **never** traverses the API servers. |
| Worker scaling | Stateless pods on K8s, autoscaled by KEDA on `audio.transcode.v1` consumer lag |
| Idempotency | Deterministic keys + `UNIQUE (media_item_id, profile)`; retries are free |
| Retries | 3 attempts, exponential backoff, then DLQ topic; `status → 'failed'`, surfaced in the admin portal |
| **Verification** | Every output probed before upload — see below. A truncated encode that still produces a *valid* file is the failure mode most likely to reach users. |
| Concurrency | One item per worker; ffmpeg already saturates cores via `-threads` |

**Per-output verification, before anything is uploaded:**

```bash
ffprobe -v error -show_format -show_streams -of json "aac_160.m4a"
```

Assert, and fail the job if any check fails:

- `codec_name` matches the profile
- `duration` matches the master within ±100 ms — catches truncated encodes
- `channels` and `sample_rate` match what was probed from the master
- `byte_size` is read **from the encoded file**, never computed as bitrate × duration.
  `-b:a` is a target; AAC varies its instantaneous rate even in ABR mode, so a derived figure
  will disagree with reality and break byte-range behaviour in the manifest.

Two audio-specific traps worth stating explicitly, both of which produce files that pass every
structural check:

- **Lossy codecs can overshoot 0 dBFS.** Decoder reconstruction may exceed the master's peak
  and clip on playback. This is precisely why `true_peak_dbfs` is stored — the client
  attenuates when `normalizeAudio` is on.
- **Do not auto-trim silence.** Church recordings often open with 10–20 s of room tone, and
  `silenceremove` will strip it — along with intentional fade-ins and quiet a cappella intros.
  Detect long leading/trailing silence and **flag it for human review in the admin portal**
  rather than cutting it. Truncating the opening of a hymn is the kind of error contributors
  notice and do not forgive.

### 11.8 Serving — manifest, then signed URL

```
GET /v1/media/{id}/stream            → manifest (below)
GET /v1/media/{id}/stream/{profile}  → 302 → short-lived signed CDN URL
```

```jsonc
{
  "media_item_id": "uuid",
  "duration_ms":   245000,
  "loudness_lufs": -13.7,
  "target_lufs":   -14.0,
  "gain_db":       -0.3,        // client applies this when normalizeAudio is on
  "waveform_url":  "<signed>",
  "profiles": [
    { "profile": "aac_96",  "bitrate_kbps": 96,  "byte_size": 2949120 },
    { "profile": "aac_160", "bitrate_kbps": 160, "byte_size": 4915200 }
  ]
}
```

The client picks a profile from the user's quality setting plus a network hint, then requests
that one signed URL. **We do not mint signed URLs for every profile at once** — that is 4x the
leak surface for a single playback.

**No HLS/DASH.** Video needs segmented ABR because a 2-hour film over a varying network must
switch quality mid-stream. Music does not work that way — Spotify streams whole encoded files
over HTTPS with range requests and aggressive client caching, not HLS segments. One file per
profile plus HTTP range requests gives us seeking, partial caching, and native support in both
`expo-av` and `<audio>`, for a fraction of the pipeline complexity.

Revisit only if week-8 telemetry shows East African users stalling mid-track in a way a lower
starting tier does not fix. That is a measurement, not a week-1 design decision.

### 11.9 Sizing — this is not where cost lives

ffmpeg encodes audio at roughly 50–100× realtime per core:

| Item | Profiles | Wall time |
| --- | --- | --- |
| 4-min song | 4 | ~5–10 s |
| 45-min sermon | 3 | ~60–90 s |

A 10,000-item catalogue is a few hours on a handful of workers. Masters plus all derivatives
for 10,000 songs is roughly **600 GB — about $15/month** on S3. Transcoding is neither the cost
centre nor the complexity centre; **the submission portal and the CDN/signed-URL work will take
D longer than the transcoding itself.** Staff and sequence accordingly.

### 11.10 D's day-1 checklist

1. Decide the `libfdk_aac` non-free build question (§11.2) and pin the ffmpeg container image
2. Provision both buckets with lifecycle policies; provision CDN with signed-URL support
3. Build the transcode worker against a local file — no Kafka, no S3, no catalog service
4. Publish `audio.transcode.v1` schemas to `contracts/kafka/` for A to build against
5. Demo target for end of week 2: **a file dropped in a bucket becomes four playable,
   loudness-tagged M4As reachable through an expiring signed URL**
