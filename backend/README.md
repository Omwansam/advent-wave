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
contracts/         THE source of truth: Flyway DDL, API DTOs, event payloads, Redis registry
platform-core/     WS A — users, settings, library, playlists, player state, outbox
catalog-service/   WS B — media items, artists, albums, search, stream manifests
reco-service/      WS F — content-based recommender (v1)
gateway/           the only bootable artifact: REST surface, security, response assembly
tools/             generate-seed.mjs — regenerates the seed migration from the client's mock data
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

**Scaffolding, and why**

| Thing | Status | Replaced by |
| --- | --- | --- |
| `POST /v1/auth/session` | Verifies no credential | The managed IdP, once chosen (§1 pre-work) |
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

## Regenerating the seed

```bash
node backend/tools/generate-seed.mjs
```

Reads `src/data/mockData.js` and `src/data/recommendationMeta.js`, writes
`V2__seed_reference_catalogue.sql`. Ids are UUIDv5 over a fixed namespace, so regeneration is
byte-identical and the Flyway checksum holds. Editing the generated SQL by hand is how the two
drift apart.

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

Setting `spring.security.oauth2.resourceserver.jwt.issuer-uri` switches to real IdP validation and
retires both the dev decoder and the session endpoint.
