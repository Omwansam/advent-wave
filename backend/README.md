# AdventWave Backend

Java 21 (LTS) + Spring Boot 3.5.3, per the pinned decisions in `BACKEND_BUILD_PLAN.md` §1.

## Run it

Two supported paths. Both end with the gateway on `localhost:8080` and Flyway applying the
schema and the reference catalogue on first boot.

### With Docker

```bash
docker compose -f backend/docker-compose.yml up -d      # Postgres 15 + Redis 7
cd backend && ./mvnw -q -DskipTests install && ./mvnw spring-boot:run -pl gateway
```

### Without Docker

For a machine that cannot run containers. Postgres is installed natively; Redis is skipped.

```bash
cd backend
./tools/setup-local-db.sh             # one time: creates the adventwave role and database
./mvnw -q -DskipTests install
./mvnw spring-boot:run -pl gateway -Dspring-boot.run.profiles=local
```

The `local` profile lives in `gateway/src/main/resources/application-local.yml` and does one
thing: point the datasource at port 5433 instead of the 5434 default. Edit it if your cluster
is elsewhere, or override without touching a file:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/adventwave \
  ./mvnw spring-boot:run -pl gateway
```

`setup-local-db.sh` is the one-time equivalent of the `POSTGRES_*` variables in
`docker-compose.yml`. It creates the role and the database only — Flyway still owns every
table. Find your cluster's port with `pg_lsclusters`; Debian's default for a 16/main cluster
is often 5433 rather than 5432, and `application.yml` defaults to 5434 because that is what
`docker-compose.yml` publishes. All three are different on purpose, so set the one you have.

Redis is optional either way. It is a cache and a write buffer, never a source of truth:
every call site catches its own failure and falls through to Postgres. Without it the app is
correct and slightly slower, `/actuator/health` reports DOWN, and `PlayerStateService` logs
one warning per 30-second flush tick. Set `management.health.redis.enabled: false` in the
`local` profile to quiet the health check, or install it natively with
`sudo apt install redis-server` — no container needed.

Note the two Maven steps. `spring-boot:run -pl gateway -am` does **not** work: `-am` puts the
aggregator root and the four library modules into the reactor, a goal named on the command
line runs against every project in it, and the plugin hits the root pom first and fails with
"Unable to find a suitable main class". Install the siblings, then run `gateway` alone.

Then:

```bash
# Get a development token (stands in for the managed IdP until one is chosen)
TOKEN=$(curl -s localhost:8080/v1/auth/session \
  -H 'Content-Type: application/json' \
  -d '{"email":"listener@adventwave.app","name":"Listener"}' | jq -r .token)

curl -s localhost:8080/v1/home -H "Authorization: Bearer $TOKEN" | jq
curl -s 'localhost:8080/v1/search?q=nairobi' -H "Authorization: Bearer $TOKEN" | jq
```

### The JDK, once per machine

Nothing above sets `JAVA_HOME`, and it does not need to be a JDK 21 — Maven can run on
whatever `java` is first on your `PATH`. The root pom registers `maven-toolchains-plugin`,
which locates a real JDK 21 through `~/.m2/toolchains.xml` and hands it to the compiler,
to Surefire, and to the JVM `spring-boot:run` forks. Write that file once:

```bash
./mvnw -N toolchains:generate-jdk-toolchains-xml -Dtoolchain.file=$HOME/.m2/toolchains.xml
```

It scans the usual install locations and records every JDK it finds. If no JDK 21 is
registered the build stops immediately with "Cannot find matching toolchain", rather than
compiling against the wrong release or failing later with a class-version error.

## Layout

Module boundaries mirror the workstream charters, so a module can be lifted into its own
deployable without a rewrite. None of them depend on each other — only on `contracts` — which is
what makes that true rather than aspirational.

```
contracts/         Java consumer of <repo>/contracts (the source of truth): Flyway DDL, DTOs, event records, RedisKeys
platform-core/     WS A — users, settings, library, playlists, player state, outbox
catalog-service/   WS B — media items, artists, albums, search, stream manifests
reco-service/      WS F — content-based recommender (v1)
gateway/           the only bootable artifact: REST surface, security, response assembly
tools/             dump-openapi.sh / dump-schema.sh regenerate the generated contracts; validate-contracts.py checks them;
                   transcode.py is the worker's steps; licensing-review.sh checks published items' consent records
runbooks/          what to do when something goes wrong: transcode-pipeline.md
```

## What is real and what is scaffolding

Honest inventory, because "it runs" and "it is done" are different claims.

**Real**

- Postgres schema from plan §1 day 1, with publication gated on a granted licence by a database
  trigger — not by application code.
- Transactional outbox. `OutboxWriter` refuses to run outside a transaction, and
  `OutboxAtomicityTest` proves the rollback direction.
- Search ranking, ported score-for-score from `searchRank.js`, Kenya boost included.
- The recommender, ported from `getRecommendations.js`, cold-start behaviour intact.
- Play counting and private-session enforcement, both server-side, both tested.
- Signed, expiring playback URLs. No endpoint returns a durable media URL.
- Redis write buffer for player state, with the documented ≤30s loss window.
- Listener accounts: email and password, lockout, single-use emailed reset and verification links,
  sessions that end on a password change ([RFC 0005](../contracts/rfcs/0005-listener-accounts.md)).
- Masters and derived audio in S3-compatible object storage, presigned uploads and playback
  ([RFC 0006](../contracts/rfcs/0006-object-storage.md)).
- Friend activity, with private session and the share setting enforced on the server
  ([RFC 0007](../contracts/rfcs/0007-friend-activity.md)).
- A one-server deployment: [`deploy/README.md`](../deploy/README.md).

**Scaffolding, and why**

| Thing | Status | Replaced by |
| --- | --- | --- |
| `POST /v1/auth/session` | Verifies no credential; local development only | Listener accounts (RFC 0005) on every server; the route is off there |
| `listening_history` in Postgres | Works, wrong home | Cassandra `listening_history_by_user`, WS C |
| Outbox rows, unpublished | Written correctly, nothing reads them | Debezium → Kafka, WS C |
| Search via Postgres `ILIKE` | Correct ranking, wrong engine | Elasticsearch, WS B |
| `seed_source_url` playback | Logs a warning on every use | Real masters + transcodes, WS D and H |
| Reference catalogue | 36 items from `mockData.js` | Church-sourced content, WS H |

Each of these is behind an interface or a repository, so the swap is an implementation change.

## Tests

```bash
cd backend && ./mvnw test
```

Integration tests need Docker; they start Postgres and Redis via Testcontainers. Real Postgres,
not H2 — half of what is under test *is* Postgres (the publication trigger, JSONB queues,
transactional rollback), and H2 would pass tests production would fail.

Without Docker, the three container-free unit tests still run. They cover the ported algorithms,
which is where the subtle behaviour lives — search ranking, the recommender, and the play-counting
boundaries:

```bash
cd backend && ./mvnw test -pl contracts,catalog-service,reco-service
```

`gateway`'s four tests are all Testcontainers-backed and cannot run without a container
runtime — including the three named below. Treat a green run of the command above as a much
weaker signal than a green `./mvnw test`.

The three that matter most:

- `OutboxAtomicityTest` — workstream A's stated exit criterion.
- `PrivateSessionConformanceTest` — the privacy rule from §4 weeks 5–6.
- `PublicationGateTest` — no unlicensed item can be published, enforced in SQL.

## The seed

V2 was generated from `src/data/mockData.js` with ids that are UUIDv5 over a fixed namespace; the
generator is not in the tree. Treat V2 as frozen — edit V3 (demo accounts) or add a migration.

## Configuration

Everything below is overridable by environment variable; see `gateway/src/main/resources/application.yml`.
Standard Spring Boot externalized configuration applies, highest precedence first: command-line
arguments, then environment variables, then a `application-{profile}.yml`, then the defaults
baked into `application.yml`. Every property is also settable by its relaxed-binding name
regardless of the aliases below — `spring.datasource.url` as `SPRING_DATASOURCE_URL`, and so on.

For local work, put overrides in `application-local.yml` and run with
`-Dspring-boot.run.profiles=local`. On a server, set them as real environment variables.

| Variable | Default | Notes |
| --- | --- | --- |
| `ADVENTWAVE_DB_URL` | `jdbc:postgresql://localhost:5434/adventwave` | 5434 is docker-compose's published port; a native install is usually 5432 or 5433 |
| `ADVENTWAVE_REDIS_HOST` | `localhost` | |
| `ADVENTWAVE_CORS_ORIGINS` | `http://localhost:5173` | The Vite dev server |
| `ADVENTWAVE_DEV_ISSUER` | `true` | **Must be false in production** |
| `ADVENTWAVE_DEV_SECRET` | dev placeholder | |
| `ADVENTWAVE_SIGNING_SECRET` | dev placeholder | HMAC key for playback URLs |
| `ADVENTWAVE_API_BASE_URL` | `http://localhost:8080` | Appears in generated URLs |
| `ADVENTWAVE_ADMIN_TOKEN_SECRET` | dev placeholder | HMAC key for admin-portal tokens (≥ 32 bytes). **Set in production** |
| `ADVENTWAVE_UPLOAD_SIGNING_SECRET` | dev placeholder | HMAC key for local upload URLs |
| `ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL` / `_PASSWORD` | unset | The first super admin, created only while no admin account exists |
| `ADVENTWAVE_LOCAL_WORKER` | `true` in `local`, else `false` | Runs the transcode worker in the gateway; `true` on the single server too |
| `ADVENTWAVE_LISTENER_TOKEN_SECRET` | dev placeholder | HMAC key for listener tokens (≥ 32 bytes). **Set in production** |
| `ADVENTWAVE_APP_BASE_URL` | `http://localhost:5173` | The listener app's origin, for emailed links; https on a server |
| `ADVENTWAVE_MAIL_MODE` | `log` | `smtp` on a server, with `SPRING_MAIL_HOST`, `_PORT`, `_USERNAME`, `_PASSWORD` |
| `ADVENTWAVE_STORAGE_MODE` | `local` | `s3` on a server, with `ADVENTWAVE_S3_*` (endpoint, region, keys, the two buckets) |

The gateway refuses to start outside the `local` profile while any of these is still a development
value; [`deploy/gateway.env.example`](../deploy/gateway.env.example) is the complete server list.

Setting `spring.security.oauth2.resourceserver.jwt.issuer-uri` switches to real IdP validation and
retires both the dev decoder and the session endpoint.

## The ingest surface

`/v1/admin/**` — churches, licences, artists, albums, media items and their lifecycle
(`draft → processing → published → withdrawn`), and the staff accounts that run them (RFC 0001,
`contracts/rfcs/0001-admin-portal.md`). The admin portal is `admin/advent-admin/`.

**Sign-in and roles.** Staff sign in with an email and a password at `POST /v1/auth/admin/login`
(table `admin_accounts`, bcrypt). Each operation needs one permission of the account's role —
`catalog:read`, `media:write`, `media:publish`, `rights:write`, `admins:manage` — and the gateway
reads the account on every request, so a role change, a password change, a deactivation or a
sign-out takes effect at once. Five wrong passwords lock an account for 15 minutes. The first
super admin is created at startup from `adventwave.auth.admin.bootstrap-email` /
`bootstrap-password` while no account exists; locally they are in the gitignored
`gateway/config/application-local.yml`. The dev issuer no longer grants admin rights (set
`ADVENTWAVE_ADMIN_EMAILS` only for old tooling). Nothing is visible to listeners before
`published`, and publication is the database trigger's decision, not the API's.

```bash
# the password is the bootstrap one from gateway/config/application-local.yml
ADMIN=$(curl -s localhost:8080/v1/auth/admin/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@adventwave.app\",\"password\":\"$ADVENTWAVE_ADMIN_PASSWORD\"}" | jq -r .token)
curl -s localhost:8080/v1/admin/media?status=processing -H "Authorization: Bearer $ADMIN" | jq
```

**Adding a recording**, as the portal does it: `POST /v1/admin/media` (a draft) →
`POST /v1/admin/media/{id}/upload` (a signed URL) → `PUT` the file's bytes to that URL, no token
→ `POST /v1/admin/media/{id}/transcode` with the returned `masterStorageKey`. In the `local`
profile `LocalTranscodeWorker` consumes the `requested` message, runs `tools/transcode.py`, and
appends the `completed` message `TranscodeCompletedHandler` consumes; the item publishes itself
if its licence is granted. Startup fails if python3, ffmpeg or ffprobe is missing
(`ADVENTWAVE_LOCAL_WORKER=false` to run without the worker).

When an item is stuck, failed or gone from listeners: `runbooks/transcode-pipeline.md`. Before
anything goes public: `tools/licensing-review.sh`, which exits 1 while any published item lacks
a real consent record.
