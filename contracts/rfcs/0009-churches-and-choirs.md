# RFC 0009 — Churches, choirs and ministries: what a profile is, and where it belongs

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-23 |
| Contracts | **1.8.0** |
| Compatibility class | **Minor**: one table, five optional columns, two operations, optional response and event fields. Nothing existing changes shape or meaning |
| Workstreams | **A** gateway, **B** catalogue, **G** web and admin clients |

## Why

Every profile in AdventWave is an "artist", and that is all the app can say about it. A church,
its main choir, its youth choir, a children's choir, an independent group with its own catalogue,
a preacher and a radio ministry all look the same: a circle, a name, "Artist". A listener cannot
see that the Youth Choir and the Main Choir are the same church's, find the choirs of the church
they attend, or browse by conference. The catalogue already has the link that would say it —
`artists.church_id` — but it means something else: the contributor that holds the rights
(`licenses.church_id`), and in the seed every artist points at one placeholder contributor.

## What the reference client does

The Spotify desktop client 1.2.95.453 (same bundle as the earlier study,
`advent-wave/SPOTIFY_FEATURE_STUDY.md`, SHA-256 `7ce05c00…f74e`) was read with REA as inert text;
nothing was executed and no code or artwork was taken.

- **One kind of creator.** Every creator is an *artist*; the page is assembled from
  `queryArtistOverview` (in `1430.js`): `profile`, `visuals.avatarImage`, `stats`,
  `discography { popularReleasesAlbums, albums, singles, topTracks }` and
  `relatedContent { relatedArtists, … }`. Its sections (`en.json`): *Popular*, *Artist pick*,
  *Discography*, *Featuring*, *Fans also like*, *Appears on*, *Discovered on*, *About* with
  monthly listeners and a verified badge.
- **A label owns artists.** `xpui-routes-label.js` / `xpui-routes-label-artists.js`: a label
  page lists its artists — the shape of a church and its choirs.
- **Popularity by place.** `xpui-routes-country-hub.js`: "Popular artists in %country%", and
  podcast charts by country (`podcast-charts-hub.js`) — the shape of "popular choirs" by
  conference.

REA's application graph does not index string literals (its trace reported no match, which it
states is not absence), so the query and field names above are from a text search of the same
files, as in the earlier study.

## The church's own structure

From the SDA Church in Kenya directory (Oct 2026), itself from the unions' pages and the Adventist
Yearbook: General Conference → **East-Central Africa Division** → **East Kenya Union Conference**
(4 conferences, 7 fields) and **West Kenya Union Conference** (5 conferences, 7 fields) → stations
and districts → local churches and companies. Most music is released by groups, not soloists:
church choirs (main, youth, children's), campus ministries (KUSDA's White Doves, Great Hope…),
independent groups (Msanii Music Group, The Lighthouse Ministers…), a few soloists and DJs.

## What

### Postgres (V11, additive)

| Table / column | Shape |
|---|---|
| `conferences` | `id` text PK, `name` unique, `short_name`, `kind` division / union / conference / field, `parent_id` → conferences, `headquarters`, `website`, `sort_order`; seeded with the division, both unions and all 23 conferences and fields |
| `artists.kind` | `church`, `choir`, `group`, `soloist`, `preacher` or `ministry`; default `choir` |
| `artists.ensemble` | `main`, `youth`, `children`, `women`, `men` or `other`; only on a choir (CHECK) |
| `artists.home_church_id` | → `artists`, ON DELETE SET NULL: the church profile this one belongs to. NULL is "independent" |
| `artists.conference_id` | → `conferences` |
| `artists.location` | town or area |

A trigger (`artists_home_church_gate`) keeps every home a church profile, and stops a church that
is home to others from becoming anything else. Existing rows are classified from their names and
recordings (`Pastor …` → preacher; `… Choir`, `… Singers`, `… Youth` → choir, with youth from the
name; `… Church`, `… Fellowship` → church unless it is a worship team or band; only sermons →
preacher; only podcasts → ministry; the rest → group). `picsum.photos` covers — development
placeholders, never anyone's picture — are cleared.

`church_id` keeps its meaning. A choir's rights holder and its home church are different
questions and often different answers (a conference holds the rights to a camp-meeting choir).

### REST

| Operation | Behaviour |
|---|---|
| `GET /v1/artists?kind=&ensemble=&independent=&church=&conference=&limit=` | `ArtistsDto { artists: [ArtistSummaryDto] }`: profiles with something published (a church counts its members'), most plays over 30 days first, then followers, then name. `kind` comma-separated; `independent=true` keeps choirs, groups and singers without a home church; `conference` may be a union, which includes its conferences and fields. `limit` 1–100, default 24; **400** outside, or on an unknown kind or ensemble |
| `GET /v1/conferences` | `ConferencesDto { unions: [ConferenceDto] }`: each union with its `conferences`, each with `churches` (church profiles with something to hear) |
| `GET /v1/artists/{id}` | `ArtistDto` gains `kind`, `ensemble`, `bio`, `location`, `followers`, `conference` (its own or its home church's, with `union`), `church` (home church), `members` (a church's choirs, groups and preachers with something to hear: choirs first, main to men's), `related` (a member's sister profiles; otherwise the same kind and ensemble, its conference first). A church's `tracks` include its members', most popular first |
| `GET /v1/admin/conferences` | `[AdminConferenceDto]` for the profile form |
| `POST`/`PUT /v1/admin/artists…` | `AdminArtistDto` and its `Request` gain `kind`, `ensemble`, `homeChurchId`, `conferenceId`, `location`. **400** for an ensemble on anything but a choir, a home on a church, a home that is not a church profile, a profile as its own home, an unknown conference, or turning a church with members into something else |

`ArtistSummaryDto { id, name, cover, kind, ensemble, verified, churchId?, churchName?, location? }`
is a profile on a card. Every field added to an existing response is optional.

### Covers

A profile without its own cover gets a gospel placeholder for its kind — a church building, a
choir, raised hands for a youth choir, an open Bible for a preacher, a microphone for a ministry
— chosen from its id so it is always the same one (`catalog Covers`). A track or album without a
cover shows its profile's. The photos are Unsplash-licensed, cropped to 640 px and served by the
web app from our own server (`advent-wave/public/covers/`, credited in `CREDITS.md`); the gateway
resolves them against `adventwave.catalog.cover-base-url` (the app's address). An editor's
cover replaces the placeholder.

### Kafka

`catalog.artist.v1` gains optional `kind`, `ensemble`, `home_church_id`, `conference_id` and
`location`. A message without `kind` predates 1.8.0 and means `choir`.

## Decisions

- **One profile type, as in the reference client.** A church, a choir and a preacher are all
  artists with a kind, so recordings, follows, play counts, search and the library work for every
  one of them unchanged. A separate church entity would have needed all of that twice.
- **A new column, not a new meaning for `church_id`.** Rights and belonging differ; changing what
  an existing column means is a breaking change in all but name.
- **"Independent" is the absence of a home church**, not a flag that can disagree with it.
- **Only profiles with something to hear are listed.** An empty choir page is a dead end; editors
  see every profile in the admin portal. Profiles from the directory can be created before their
  recordings arrive and stay out of the listings until then.
- **The directory's structure is reference data, its congregations are not.** The 26 conference
  rows go in with the migration. Churches and choirs from the directory are added by editors as
  their recordings are licensed — a profile is a promise that there is something to hear.
- **Popular is plays, then followers.** The same 30-day window the home rails use; a church's
  plays include its choirs', so the church of a much-loved youth choir rises with it.

## Verified

- V11 dry-run in a rolled-back transaction on the local database, then applied by Flyway: the 41
  seed profiles classified as above (13 choirs, 5 youth choirs, 2 churches, 15 groups, 3
  ministries, 3 preachers), 26 conference rows.
- `CoversTest`: own cover wins; a path is the web app's; each kind draws from its own set; the
  same profile always gets the same photo.
- Local gateway: a church profile created through the admin API in Central Kenya Conference with
  its choir attached; the church page plays the choir's song and lists it; the choir page names the
  church and inherits its conference; an independent youth choir gets other youth choirs; the
  conference filter rolls a union up; each admin rule answers 400 with its message.
- REA drove the web app in headless Chrome: Choirs & churches page with chips, conference picker
  and round placeholder covers.
- Testcontainers integration tests were **not** run (no Docker on this machine); their six-argument
  `AdminArtistDto.Request` calls were padded with nulls.
