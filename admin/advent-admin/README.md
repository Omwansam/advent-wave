# AdventWave Admin

The super-admin web app: one administrator runs the whole catalogue (churches, consent,
licences, artists, albums, songs, sermons, podcasts), and adding a recording uploads its master
straight to storage and sends it through the transcode pipeline.

Built to Part 2 of `advent-wave/Super-admin-build.md`. Same stack and look as the listener app
(`advent-wave/`), but denser: tables, forms, side navigation. It shares no code with it; the API
client, token holder and `--aw-*` design tokens are copied, not imported.

## Run

```sh
npm install
npm run dev        # http://localhost:5174 (strict: fails rather than hopping ports)
npm run lint
npm run build
```

The dev server proxies `/v1` to the gateway (`http://localhost:8080`, or
`VITE_API_PROXY_TARGET`). Start the gateway from `backend/` with
`./mvnw spring-boot:run -pl gateway -Dspring-boot.run.profiles=local`.

The gateway allows `http://localhost:5174` by default (`adventwave.cors.allowed-origins`). That
matters for one request: the master upload goes from the browser straight to the issued
`uploadUrl`, cross-origin, as it would to S3. Everything else goes through the proxy.

## Sign-in and roles

Email and password, at `POST /v1/auth/admin/login`. Accounts live in the gateway's
`admin_accounts` table; there is no self-registration.

- **The first account** is a super admin created by the gateway at startup from
  `adventwave.auth.admin.bootstrap-email` / `bootstrap-password` while no account exists. Locally
  those are in `backend/gateway/config/application-local.yml` (gitignored). Change the password
  from **My account** once signed in.
- **Everyone else** is created by a super admin under **Admin accounts**, with a temporary
  password they must replace at first sign-in (the gateway allows nothing else until they do).
- **Roles:** super admin (everything, including accounts), content manager (artists, albums,
  recordings, publishing), rights manager (churches, consent, licences), viewer (read only).

The gateway is the authority. It re-reads the account on every request, so a role change, a
disabled account, a password change or **Sign out everywhere** ends sessions at once; the app
then signs out on the 401. The app reads the account's permissions only to decide which buttons
and pages to offer, and shows any 403 in the server's words.

## Screens

| Route | Screen |
| --- | --- |
| `/sign-in` | Email and password |
| `/account/password` | Choose a password (after a temporary one) |
| `/account` | My account: role, permissions, change password, sign out everywhere |
| `/accounts` | Admin accounts (super admins): create, change role, disable, reset password |
| `/` | Dashboard: counts by status, and *Needs attention* (failed, flagged, processing > 30 min, outputs stored but waiting on a licence) |
| `/media/new` | Add media: type → artist (or create one inline) → licence → details → file → draft, upload URL, PUT with progress and cancel, transcode |
| `/media` | Media library: type and status filters, title search |
| `/media/:id` | Media detail: metadata (PATCH), status timeline, loudness, review flags, failure reason, outputs, per-profile preview, publish / withdraw / retry / change licence, resume an interrupted ingest. Polls every 2 s while processing |
| `/review` | Review queue: failed and flagged items, oldest first, with preview and actions inline |
| `/churches`, `/churches/:id` | Churches; consent; licences (create, change status, expiry) and the church's artists |
| `/artists`, `/artists/:id` | Artists; their albums (create, edit) and media |

Server refusals (409 conflicts, the licence gate, an existing master, 400 validation) are shown
next to the action that caused them, in the server's own words.

## Layout

```text
src/
  api/         client.js (fetch + ApiError), token.js, upload.js (XHR PUT), index.js (one function per operation)
  lib/         ingest steps and resume record, media vocabulary, formatting, JWT, licence expiry
  hooks/       useAsync (load/reload/mutate), useAction (inline refusals), useIngestRunner, useMasterFile
  store/       auth (token + scope check), catalogue lookups (artists, churches), UI theme
  components/  table, form, chip, notice and modal primitives; MediaTable, IngestProgress, ResumeIngest,
               PreviewPlayers, ReviewNotes, LicensePicker, StatusTimeline; forms/ for create/edit modals
  pages/       one file per screen
```

## Gateway endpoints this app needs

It uses the `/v1/admin` surface as of contracts 1.3.0 (`contracts/rfcs/0001-admin-portal.md`):

| Endpoint | Used by |
| --- | --- |
| `POST /v1/admin/media/{id}/upload` and the signed `PUT` target | Add media, resume |
| `GET /v1/admin/media/{id}/preview` | Media detail, review queue |
| `GET /v1/admin/albums?artistId=` | Artist detail, Add media, metadata edit |
| `GET /v1/admin/licenses?status=` | (wrapper ready; screens use the per-church list) |
| `mediaType`, `q` on `GET /v1/admin/media` | Media library (also filtered client-side) |
| `reviewFlags`, `failureReason` on `AdminMediaItemDto` | Dashboard, review queue, media detail |
| `POST /v1/auth/admin/login`, `/v1/admin/me/**`, `/v1/admin/accounts/**` | Sign-in, My account, Admin accounts |
| The local transcode worker (`local` profile) | Everything after "Request the transcode" |
