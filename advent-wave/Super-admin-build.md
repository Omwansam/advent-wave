Super-admin system: a prompt to copy
The user wants a prompt for a coding agent to use later. That agent will build a super-admin system where they can do everything: create churches, licences, artists and albums, and add songs that go through our transcode steps automatically.

The only action after approval: save the prompt below as advent-wave/ADMIN_AGENT_PROMPT.md, next to MOBILE_AGENT_PROMPT.md, as plain markdown (without the outer code fence), and leave it there. Nothing is built or run, no other file changes, and nothing is committed.

Defaults taken (the user asked for speed over questions):

separate app advent-admin/
full catalogue scope
users management and curated playlists left out (can be a follow-up prompt)
Grounded in the repo as read this session:

the admin controllers, DTOs and dispatcher behaviour
transcode.py and the local media origin
the contract change procedure
the no-Docker rule
# AdventWave Super-Admin — Agent Prompt

Build the AdventWave super-admin system: a web app where one administrator runs the whole
catalogue (churches, consent, licences, artists, albums, songs, sermons, podcasts), and where
adding a recording uploads its master and sends it through the transcode pipeline automatically,
until it plays in the listener app.

Repository: /storage/Development/Cassava/Sabbath
- backend/       Spring Boot 3.5, Java 21, Maven modules: gateway, catalog-service, events-pipeline, platform-core, contracts
- advent-wave/   the listener web app (React). Do not put admin code in it.
- contracts/     the source of truth for every API, table and event
- advent-admin/  NEW: the app you create

Read first, in this order:
1. contracts/README.md (how a contract may change)
2. contracts/audio/transcode.md (ladder, worker steps, what the worker must never do)
3. contracts/kafka/audio.transcode.v1/schema.json (the requested and completed messages)
4. backend/tools/transcode.py (the worker steps, already implemented and verified)
5. backend/gateway/src/main/java/org/adventwave/gateway/api/admin/ and gateway/admin/ (CatalogAdminService, MediaPublicationService)
6. backend/gateway/.../events/TranscodeCompletedHandler.java and backend/events-pipeline/.../outbox/OutboxDispatcher.java
7. backend/gateway/.../api/LocalMediaOriginConfig.java and .../security/SecurityConfig.java
8. advent-wave/src/api/client.js, src/api/token.js, src/index.css, vite.config.js

## Hard rules

- Never run Docker on this machine: no docker CLI, and no Maven test runs (every gateway test extends IntegrationTest, which starts Testcontainers). Write integration tests in the existing style for the new endpoints, but do not run them; CI runs them. Compile with ./mvnw -q install -DskipTests and verify against the running app.
- Local stack: native Postgres 16 on port 5433. Gateway: from backend/, ./mvnw spring-boot:run -pl gateway -Dspring-boot.run.profiles=local. The DB password is in backend/gateway/config/application-local.yml (gitignored): pass it to tools through environment variables, never print or copy it. Media root is ~/media (ADVENTWAVE_MEDIA_ROOT).
- Check port 8080 is free before starting the gateway. Stop every process you started when you finish.
- contracts/openapi/adventwave.yaml and contracts/postgres/schema.sql are generated. Regenerate them; never hand-edit.
- Additive changes only: new endpoints, optional fields, nullable or defaulted columns. No renames, removals or destructive migrations.
- Audio rules: never re-encode to normalise loudness, never trim silence, never delete or overwrite a master. Flags are for human review.
- Publication requires a granted licence, enforced by the database trigger media_items_publication_gate. Never work around it; show its refusal to the admin.
- Do not commit. Leave changes in the working tree.

## What already exists (reuse it)

Admin API, all under /v1/admin, scope catalog:write:
- Churches: GET/POST /churches, GET/PUT /churches/{id}, PUT /churches/{id}/consent (none|pending|granted|revoked), GET /churches/{id}/licenses
- Licences: POST /licenses, GET /licenses/{id}, PUT /licenses/{id}/status (pending|granted|revoked|expired)
- Artists: GET/POST /artists, GET/PUT /artists/{id} (fields include churchId, verified)
- Albums: POST /albums, GET/PATCH /albums/{id}
- Media: GET /media?status=&limit=; POST /media (creates a draft; durationMs >= 1 required); GET/PATCH /media/{id}; POST /media/{id}/transcode {masterStorageKey} (from draft or failed only: sets processing and emits `requested`); POST /media/{id}/publish; POST /media/{id}/withdraw
- DTOs: backend/contracts/src/main/java/org/adventwave/contracts/api/admin/
- Error bodies: see ApiExceptionHandler; conflicts are AdminConflictException (409) with a readable sentence.

Auth: POST /v1/auth/session {email} returns a JWT. Emails in adventwave.auth.admin-emails (default admin@adventwave.app) get scope catalog:write. It is an email-only dev issuer, so the admin app is local-only until a real IdP exists. Say so on the sign-in screen.

Transcode pipeline:
- backend/tools/transcode.py run --media-item-id ID --media-type song|sermon|podcast --master-key masters/ID/original.EXT [--media-root DIR] runs these steps:
  - probe
  - one pass of encode, loudness measurement and silence detection
  - verify every output
  - atomic swap into derived/ID/
  It prints the `completed` (or `failed`) message JSON on stdout and logs on stderr; exit 0 means completed, 1 failed. It reads any container with an audio stream, MP4 video included.
- A `completed` message appended to the outbox (event_type audio.transcode.v1) is consumed by TranscodeCompletedHandler. It stores media_assets and loudness, then publishes, or leaves the item in processing when the licence isn't granted.
- Derived files are served at /media-storage/derived/** by LocalMediaOriginConfig (local profile).
- Missing, and yours to build: nothing consumes `requested`, and there is no upload path.

## Part 1: Backend

### 1.1 Upload (a master never passes through the API's memory)
Plan section 11.7 says presigned PUT direct to storage. Emulate it locally with the production shape.
- POST /v1/admin/media/{id}/upload, body {filename, contentType, sizeBytes}, returns {uploadUrl, method: "PUT", masterStorageKey, expiresAt}.
  - masterStorageKey = masters/{id}/original.{ext}. Take ext from the filename, lower-cased, from this allowlist: wav, flac, aif, aiff, mp3, m4a, aac, ogg, opus, mp4, mov, webm. Anything else is 400.
  - 409 if masters/{id}/ already holds an original.* file; masters are never replaced.
  - 400 if sizeBytes exceeds adventwave.audio.max-upload-bytes (default 4 GB).
  - Only for items in draft or failed.
- Local target: PUT /v1/uploads/{id}?key=&exp=&sig=, HMAC-SHA256 over id|key|exp with its own secret. Compare in constant time; expiry 10 minutes. Model it on SignedUrlMinter in catalog-service.
  - Stream request.getInputStream() to {media-root}/masters/{id}/.partial-original.{ext}, then rename atomically. Never use @RequestBody byte[].
  - Reject the upload if Content-Length exceeds the cap or the bytes written differ from it, and refuse if a master appeared meanwhile.
  - 201 on success.
- Register the upload endpoint and its permitAll rule (PUT only, authorised by its signature like /v1/media/*/stream/*) only when adventwave.catalog.local-media-root is set, the way LocalMediaOriginConfig does it.
- Put the URL issuer behind an interface with this local implementation, so production can return an S3 presigned URL from the same POST. Write no S3 code.

### 1.2 Worker runner (consumes `requested`)
OutboxDispatcher calls handlers synchronously inside its batch transaction and never retries a handler that throws, and a transcode takes minutes. So:
- TranscodeRequestedHandler (topic audio.transcode.v1, kind requested) claims via ProcessedEvents, enqueues {mediaItemId, mediaType, masterStorageKey, attempt} and returns immediately.
- LocalTranscodeWorker runs one item at a time on one thread (ffmpeg already uses every core). It runs python3 {adventwave.audio.transcode-script} run ... --media-root {local-media-root}, without --deliver, with timeout adventwave.audio.transcode-timeout (default 60m).
  - If stdout parses as a message for this media item, append it to the outbox with OutboxWriter.append(..., eventId) using the message's event_id. Do it inside a TransactionTemplate, because append requires an existing transaction.
  - A `failed` message from the tool (probe, encode or verify) is final; deliver it as is.
  - A crash, a timeout or unparseable output gets a retry with backoff: attempt 2 after 30 s, attempt 3 after 2 min. After the third, append a `failed` message (error.code encode_failed, stage encode) whose message says what happened.
  - Log the tool's stderr at INFO, prefixed with the media item id.
- On startup, re-enqueue every media item in processing whose latest `requested` outbox row has no later `completed` row. Transcoding is deterministic, so a re-run is safe.
- Properties under adventwave.audio:
  - local-worker-enabled: true only in application-local.yml
  - transcode-script: default ../tools/transcode.py, relative to backend/gateway, where spring-boot:run runs
  - transcode-timeout
  - max-upload-bytes
  If the worker is enabled and the script, python3, ffmpeg or ffprobe is missing, fail fast at startup.

### 1.3 Make review and failure visible
Today TranscodeCompletedHandler drops `flags`, and markFailed only logs the reason.
- Migration V5__media_review.sql adds media_items.review_flags TEXT[] NOT NULL DEFAULT '{}' and media_items.failure_reason TEXT. Comment the reason for each, as V1 does.
- storeTranscodeOutputs stores the flags and clears failure_reason. markFailed stores the reason. Requesting a new transcode clears both.
- AdminMediaItemDto gains reviewFlags (list) and failureReason (nullable), both optional.

### 1.4 Endpoints the forms need
- GET /v1/admin/albums?artistId= (list)
- GET /v1/admin/licenses?status= (list across churches)
- GET /v1/admin/media/{id}/preview returns {profile: url} for every stored asset, whatever the item's status. Build each URL like StreamService does: CatalogProperties.mediaOrigin() + "/" + storageKey. This lets the admin listen before publishing. Locally these URLs are the unauthenticated local origin; note in the RFC that production needs signed CDN URLs here.
- GET /v1/admin/media also accepts mediaType and q (title contains, case-insensitive).

### 1.5 CORS
Add http://localhost:5174 and http://127.0.0.1:5174 to the default of adventwave.cors.allowed-origins in application.yml. The admin app proxies /v1, but the browser PUTs the upload straight to uploadUrl, cross-origin, exactly as it would to S3.

### 1.6 Contract change (follow contracts/README.md "Changing a contract")
- Write contracts/rfcs/0001-admin-portal.md: what changes, why, the workstreams affected (A gateway, D audio, G client), and the compatibility class (minor, additive).
- Bump contracts/VERSION and adventwave.contracts.version in application.yml to 1.3.0.
- With the gateway running, regenerate with backend/tools/dump-openapi.sh and backend/tools/dump-schema.sh (pg_dump against port 5433, no Docker).
- In contracts/audio/transcode.md, update the status line (the upload and worker runner now exist locally) and describe how review flags and failure reasons are stored.
- Update the producer line for `completed` in contracts/kafka/audio.transcode.v1/README.md.

## Part 2: The admin app (advent-admin/)

Stack: the same as advent-wave (React 19, Vite 8, Tailwind 4 via @tailwindcss/vite, zustand, react-router-dom 7, lucide-react, plain JS).
- Dev server on port 5174 with strictPort. Proxy /v1 to http://localhost:8080 as advent-wave/vite.config.js does, and read its comment about the Origin header.
- Copy the patterns of advent-wave/src/api/client.js and token.js; don't import across apps.
- Copy the --aw-* design tokens, light and dark, from advent-wave/src/index.css, and use DM Sans.
- The same look as the listener app, but denser: tables, forms, side navigation.

Auth: sign in by email. Decode the JWT payload; if its scope lacks catalog:write, show "This account is not an administrator" and sign out. Any 401 signs out; a 403 shows the server's message. The server is the authority; the client check is for UX only.

Show every server refusal next to the action that caused it, in the server's own words: a 409 conflict, the licence gate, an existing master, a 400 validation error.

Screens:
1. Dashboard: counts by status (draft, processing, published, withdrawn, failed). A "Needs attention" list:
   - failed items with their reason
   - items with review flags
   - items processing for more than 30 minutes
   - items whose outputs are stored but that wait on a licence
2. Churches: table; create and edit (name, country, region, contactEmail); consent status.
3. Church detail: its licences (create with territory, expiresAt, revenueSharePct and consentDocumentUrl; change status; see expiry) and its artists.
4. Artists: table; create and edit (name, slug, coverUrl, bio, church, verified). Artist detail lists their albums and media.
5. Albums: create and edit under an artist (title, coverUrl, releaseDate).
6. Media library: table with type and status filters, title search and status chips; each row opens its detail.
7. Add media (the main flow):
   a. Type: song, sermon or podcast.
   b. Artist (create inline if missing), then one of its church's licences. If none is granted, say the item cannot publish until one is, but let the admin continue.
   c. Album (optional, filtered to the artist), title, genre, language, region, cover URL.
   d. File: pick or drop. Read the duration in the browser from an Audio or Video element's loadedmetadata event to fill durationMs; the worker overwrites it with the measured value. Before a lossy upload (mp3, m4a, aac, ogg, opus, mp4, mov, webm), warn: "Lossy masters are accepted and flagged. Ask the church for WAV or FLAC."
   e. Create the draft (POST /media), then POST /media/{id}/upload, then PUT the file to uploadUrl with XMLHttpRequest (progress bar, cancellable), then POST /media/{id}/transcode with masterStorageKey. Finish on the media detail page.
   If a step fails, the draft remains and the detail page offers to resume from the step that failed.
8. Media detail:
   - metadata, editable through PATCH
   - status timeline: draft, processing, then published or failed
   - loudness: LUFS, true peak, and the gain a listener gets (-14 - LUFS, attenuation only)
   - review flags in plain words (lossy_master, long_leading_silence, long_trailing_silence) and the failure reason
   - assets table: profile, bitrate, size, sample rate, channels, checksum
   - a preview player per profile, from /preview
   - actions: publish, withdraw, retry transcode (failed items only, reusing the stored master), change licence
   Poll GET /media/{id} every 2 s while the item is processing.
9. Review queue: flagged and failed items, oldest first, with preview and actions inline.

## Part 3: Verify (do all of it and report what you saw)

1. ./mvnw -q install -DskipTests passes; npm run build and npm run lint pass in advent-admin.
2. With the gateway (local profile) and the admin app running, do the following through the admin UI only:
   - Create church "Verification Church", then a licence, then grant it, then an artist and an album.
   - Add a song from ~/media/masters/test-silence.wav. It publishes with long_leading_silence.
   - Add a podcast from ~/media/masters/test-lossy.mp3. It gets lossy_master and only aac_64 and aac_128.
   - Add a song directly from "/home/omwansa/Music/Nyandema Central SDA Choir - Seche Moko😥.mp4". It transcodes from the MP4 master, video container and all.
   - Upload a corrupt file (a few KB of random bytes named x.wav). It fails with a readable reason; a re-upload is refused because the master exists; a retry ends in the same final failure, not a loop.
   - With a pending licence, the transcode completes, the item stays in processing, and the dashboard shows it waiting on a licence. Grant the licence; publishing then works.
   - Stop the gateway mid-transcode and start it again. The job resumes and completes.
   - Withdraw a published item: it disappears from listener search. Publish it again: it is back.
3. Every new endpoint answers a non-admin token with 403 and no token with 401. An upload URL with an altered sig or a past exp gets 403. /media-storage/masters/** stays 401.
4. A song added through the admin plays in advent-wave (http://localhost:5173): search for it, play it, seek in it.
5. Leave seeded data and items you didn't create untouched. Delete only what you created, and never a master.

Report:
- the files you built
- the contract version and the RFC
- each verification step and its result
- anything you could not do, and why