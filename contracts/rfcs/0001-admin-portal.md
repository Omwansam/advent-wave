# RFC 0001 — Admin portal: master upload, local transcode worker, review data, staff accounts and RBAC

| | |
|---|---|
| Status | Implemented in the working tree; awaiting sign-off from workstreams A, D and G |
| Date | 2026-10-08 |
| Contracts | 1.2.0 → **1.3.0** |
| Compatibility class | **Minor, additive** (README "Versioning"): new endpoints, new optional response fields, new nullable/defaulted columns, a new table. Nothing renamed or removed. One dev-only default changes; see Compatibility. |
| Workstreams | **A** gateway (endpoints, migrations, security), **D** audio (upload path, worker), **G** client (the admin app, `admin/advent-admin/`) |

## Summary

The catalogue could be administered only with curl, and only half of the transcode seam existed:
the gateway produced `audio.transcode.v1` `requested` and consumed `completed`, but nothing
consumed `requested`, there was no way to get a master into storage, the worker's review flags
were dropped, a failure's reason was only logged, and anyone who could reach the dev token issuer
could act as admin by typing an email address.

This RFC adds what a web admin portal needs to run the whole catalogue end to end:

1. **Master upload** — `POST /v1/admin/media/{id}/upload` returns a URL the browser PUTs the file
   to directly (plan §11.7: a master never passes through the API). Locally the gateway signs
   URLs for its own streaming endpoint; production returns an object-storage presigned URL from
   the same call.
2. **A local transcode worker** — consumes `requested`, runs `backend/tools/transcode.py`, and
   produces `completed`, with retries and restart recovery. `local` profile only.
3. **Review data** — `media_items.review_flags` and `media_items.failure_reason`, exposed on
   `AdminMediaItemDto`.
4. **Endpoints the forms need** — album and licence lists, media type and title filters, and
   per-profile preview URLs.
5. **Staff accounts with email + password sign-in and role-based access control**, enforced by
   the gateway on every request.

## 1. Master upload

`POST /v1/admin/media/{id}/upload` `{filename, contentType, sizeBytes}` →
`{uploadUrl, method: "PUT", masterStorageKey, expiresAt}`.

- `masterStorageKey = masters/{id}/original.{ext}`, the extension taken from `filename`,
  lower-cased, from wav, flac, aif, aiff, mp3, m4a, aac, ogg, opus, mp4, mov, webm. Anything else
  is 400. Video containers are accepted: the worker reads their audio stream.
- 409 when `masters/{id}/` already holds an `original.*` (masters are never replaced); 409 when
  the item is not `draft` or `failed`; 400 when `sizeBytes` exceeds
  `adventwave.audio.max-upload-bytes` (default 4 GB).
- The URL issuer is the `MasterUploads` interface. `LocalMasterUploads` (present only with
  `adventwave.catalog.local-media-root`) signs `PUT /v1/uploads/{id}?key&exp&sig` with
  HMAC-SHA256 over `id|key|exp`, its own secret (`adventwave.audio.upload-signing-secret`), a
  10-minute expiry and a constant-time comparison — modelled on `SignedUrlMinter`. Without a
  `MasterUploads` bean the endpoint answers 501. **No object-storage implementation is written.**
- The local PUT streams the body to `{root}/masters/{id}/.partial-original.{ext}` and renames it
  atomically once exactly `Content-Length` bytes have arrived; it refuses (409) if a master
  appeared meanwhile, 411 without a length, 413 over the cap, 403 for a bad or expired signature.
  It is `permitAll` (PUT only), authorised by its signature like the playback redirect, and is
  `@Hidden` from the OpenAPI document: the contract is the opaque `uploadUrl`, exactly as it
  would be for S3, and the generated document is the same with or without a local media root.
- CORS: `http://localhost:5174` and `http://127.0.0.1:5174` join the default
  `adventwave.cors.allowed-origins`, because the browser PUTs to `uploadUrl` cross-origin.

## 2. Local transcode worker (workstream D, local only)

The interim dispatcher calls handlers synchronously inside its batch and never retries a handler
that throws, and a transcode takes minutes. So:

- `TranscodeRequestedHandler` (`audio.transcode.v1`, kind `requested`) claims the event through
  `ProcessedEvents` and, after the claim commits, hands `{mediaItemId, mediaType,
  masterStorageKey, attempt}` to the worker. It returns at once.
- `LocalTranscodeWorker` runs one job at a time on its own thread:
  `python3 tools/transcode.py run … --media-root {local-media-root}` (never `--deliver`), with
  `adventwave.audio.transcode-timeout` (60 min). The `completed` message the tool prints is
  appended to the outbox with its own `event_id` (K1) inside a transaction.
- A `failed` message the tool prints (probe, encode, verify, upload) is final and delivered as
  is. A crash, a timeout or output that is not a message for this item is retried after 30 s and
  then 2 min; after the third attempt the worker appends `failed` (`encode_failed`, stage
  `encode`) saying what happened. No DLQ locally.
- On startup it re-enqueues every `processing` item whose latest `requested` row has no later
  `completed` row. Transcoding is deterministic, so a re-run is safe. On shutdown it kills the
  running tool and its ffmpeg.
- Enabled only by `adventwave.audio.local-worker-enabled` (true in `application-local.yml`).
  Startup fails if the script, python3, ffmpeg or ffprobe is missing.

## 3. Review flags and failure reasons

Migration `V5__media_review.sql`:

- `media_items.review_flags TEXT[] NOT NULL DEFAULT '{}'` — the last `completed` message's
  `flags`. Written by `storeTranscodeOutputs`, replaced on every completed run.
- `media_items.failure_reason TEXT` — the worker's error message and stage, written by
  `markFailed`. Cleared when outputs are stored.
- Requesting a new transcode clears both.
- `AdminMediaItemDto` gains `reviewFlags` (array) and `failureReason` (nullable), both optional.

Flags never block publication and are never auto-corrected (plan §11.1, §11.7); they are for the
admin portal's review queue.

## 4. Endpoints for the portal's forms

| Operation | Permission | Notes |
|---|---|---|
| `GET /v1/admin/albums?artistId=` | catalog:read | newest release first; all albums (capped) without `artistId` |
| `GET /v1/admin/licenses?status=` | catalog:read | across churches, newest first; 400 for an unknown status |
| `GET /v1/admin/media?status&mediaType&q&limit` | catalog:read | `mediaType` and `q` (case-insensitive title substring, `%`/`_` literal) are new and optional; an unknown `status` still matches nothing (200) |
| `GET /v1/admin/media/{id}/preview` | catalog:read | `{profile: url}` for every stored asset at any status, built like `StreamService`: `mediaOrigin + "/" + storageKey` |

**Production note:** locally the preview URLs are the unauthenticated local media origin. In
production they must be short-lived signed CDN URLs, like the playback redirect — the
"never return an unsigned media URL" invariant applies to the admin surface too. Until a CDN
signer exists, preview answers **501** wherever no local media root is configured, rather than
hand out unsigned CDN URLs.

## 5. Staff accounts and RBAC

### Authentication

- Migration `V6__admin_accounts.sql`: `admin_accounts` — a population separate from listener
  `users`. Lower-cased unique email, `DelegatingPasswordEncoder` hash (bcrypt), role, active,
  `must_change_password`, `token_version`, `failed_logins`, `locked_until`, timestamps.
- `POST /v1/auth/admin/login` `{email, password}` → `{token, tokenType, expiresIn, account}`.
  401 "email or password is incorrect" for either half (equal cost with or without an account:
  an unknown email is compared against a decoy hash); 403 for a disabled account, only after the
  password proved right; 429 while locked — five consecutive failures lock the account for 15
  minutes. A lock never ends sessions the owner already has.
- Admin tokens are HS256 with their own secret (`adventwave.auth.admin.token-secret`), issuer
  `adventwave-admin`, 8-hour expiry, carrying the account id and `ver`. The gateway's
  `JwtDecoder` picks the key by issuer and then verifies signature, expiry and issuer; listener
  tokens are verified exactly as before.
- **The token grants nothing by itself.** On every request `AdminJwtAuthenticationConverter`
  loads the account: missing, disabled, or `ver` behind `token_version` → 401. Authorities are
  the permissions of the account's *current* role. `token_version` is bumped by sign-out
  everywhere, a password change or reset, a role change and deactivation, so each takes effect
  immediately.
- Accounts created or reset by a super admin carry a temporary password and
  `must_change_password`; until it is changed the session holds only `ADMIN_SESSION`, which
  opens `GET /v1/admin/me` and `POST /v1/admin/me/password` and nothing else.
- Passwords: at least 12 characters, at most 72 bytes (bcrypt's limit — longer would be silently
  truncated), not the email. Length over composition rules (NIST SP 800-63B).
- The first super admin is created at startup from `adventwave.auth.admin.bootstrap-email` /
  `-password` only while the table is empty; locally they live in the gitignored
  `backend/gateway/config/application-local.yml`. Never overwritten afterwards.
- An admin token cannot call the listener API (403), and a listener token cannot call the admin
  API (403): neither population can turn into the other.

### Authorisation

Permissions are `SCOPE_*` authorities, so an external IdP issuing the same scopes needs no code
change. One table, `AdminAccessRules`, maps every admin operation to one permission; SecurityConfig
enforces it and OpenApiConfig documents it per operation, so the two cannot disagree. The last
rule makes any admin write not named above it require `media:write`: a new endpoint is protected
by default.

| Permission | Operations | super_admin | content_manager | rights_manager | viewer |
|---|---|:-:|:-:|:-:|:-:|
| `catalog:read` | every `GET /v1/admin/**` | ✓ | ✓ | ✓ | ✓ |
| `media:write` | artists, albums, media items, upload, transcode | ✓ | ✓ | | |
| `media:publish` | publish, withdraw | ✓ | ✓ | | |
| `rights:write` | churches, consent, licences, licence status | ✓ | | ✓ | |
| `admins:manage` | `/v1/admin/accounts/**` | ✓ | | | |
| (session) | `GET /v1/admin/me`, `POST /v1/admin/me/password`, `POST /v1/admin/me/sign-out` | ✓ | ✓ | ✓ | ✓ |

Guards in `AdminAccountService`: nobody changes their own role or disables themself, and the last
active super admin cannot be demoted or disabled. A 403 carries a JSON body naming the missing
permission (or the pending password change), in the same shape as every other error.

### New operations

`POST /v1/auth/admin/login`; `GET /v1/admin/me`; `POST /v1/admin/me/password` (returns a new
session); `POST /v1/admin/me/sign-out` (204, every session of the account);
`GET`/`POST /v1/admin/accounts`; `PATCH /v1/admin/accounts/{id}` (name, role, active);
`POST /v1/admin/accounts/{id}/password` (temporary password, unlocks, ends sessions).

## Compatibility

- Every REST change adds an operation or an optional response field. Response bodies of
  existing operations are unchanged except `AdminMediaItemDto`'s two optional fields.
- **`catalog:write` is still honoured** on every catalogue rule, so a token carrying it — from an
  IdP, or from the dev issuer if configured — keeps exactly the access it had in 1.2.0. It does
  not reach `/v1/admin/accounts` or `/v1/admin/me`, which did not exist.
- The 403 body on `/v1/admin/**` was empty and is now the standard Error JSON; the status code is
  unchanged.
- **Dev-only default:** `adventwave.auth.admin-emails` now defaults to empty, so the email-only
  dev issuer no longer mints `catalog:write` for `admin@adventwave.app`. Leaving it would let
  anyone who can reach the issuer bypass the password sign-in. Set `ADVENTWAVE_ADMIN_EMAILS` to
  restore it for old tooling on a machine nobody else can reach.
- Postgres: one defaulted column, one nullable column, one new table. Kafka: no schema change;
  the `completed` producer now exists (locally).

## What production still needs (not in this RFC)

1. An object-storage `MasterUploads` (presigned PUT to the masters bucket, archive tier).
2. Signed CDN URLs for `GET /v1/admin/media/{id}/preview`, or the endpoint disabled.
3. The worker as workstream D's service consuming Kafka, with the planned DLQ.
4. A real `adventwave.auth.admin.token-secret` and `upload-signing-secret` from the secret store.
5. Staff sign-in through the organisation's IdP with MFA, when one is chosen; this RFC's
   password sign-in is then the break-glass path. Per-IP rate limiting on the login endpoint.
6. An audit trail of admin actions beyond the outbox (who changed which licence, when).

## Drift recorded

| Id | Finding | Smallest correction |
|---|---|---|
| O8 | springdoc names nested request records by their simple name, so the existing `Request` (five DTOs) and `Update` (two) schemas each stand for several different records (e.g. `Request` is documented once for artists, churches and media items alike). New records in this RFC have unique names (`UploadRequest`, `AccountCreateRequest`, …); the existing ones are left as they are. | `springdoc.use-fqn` or explicit `@Schema(name)` on each nested record, in an RFC of its own because it renames schemas generated clients use. |
