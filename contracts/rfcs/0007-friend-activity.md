# RFC 0007 — Friend activity: follow listeners, see what they are playing

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-20 |
| Contracts | **1.6.0**, with RFCs 0005 and 0006 |
| Compatibility class | **Minor**: two tables, one column, four operations, one optional request/response field, one new `library.events.v1` shape. Nothing existing changes shape |
| Workstreams | **A** gateway and platform-core, **F** features (consumer of `library.events.v1`), **G** web client |

## Why

The friend activity panel has shown three invented people since the first build ("Mock feed").
Listening together is how a congregation shares music; the reference client's panel is one of its
most recognisable features. The Redis key `a:friendfeed` was reserved for it in 1.0.0 with nothing
behind it.

The reference client (Spotify desktop, studied with REA for RFC 0004) shows, per followed person,
the track, its artist and "now" or how long ago; hides the whole panel in a private session; and has a
"Share my listening activity" setting, on by default.

## What

### Postgres (V10, additive)

| Table / column | Shape |
|---|---|
| `user_follows_user` | `(user_id, followee_id)` PK, both → `users` ON DELETE CASCADE; `created_at`; `CHECK (user_id <> followee_id)`; index on `followee_id` |
| `listener_activity` | `user_id` PK → `users`; `media_item_id` → `media_items`; `playing`; `updated_at` |
| `user_settings.share_activity` | `BOOLEAN NOT NULL DEFAULT TRUE` |
| index | `users_display_name_trgm_idx` (GIN trigram) for search by name |

### REST

| Operation | Behaviour |
|---|---|
| `GET /v1/users?q=&limit=` | `UserSearchDto { users: [{ id, displayName, followedByMe }] }`: names containing `q` (2–100 characters), exact matches first, then prefixes; caller excluded; `limit` 1–50 (default 20), **400** outside |
| `GET /v1/users/{id}` | `UserProfileDto { id, displayName, followerCount, followingCount, followedByMe, followsMe, isMe }`. **404** unknown |
| `PUT /v1/library/follows/user/{userId}` | Toggle, like artists and playlists: `FollowResultDto { following }`. **400** yourself, **404** unknown |
| `GET /v1/friends` | `FriendsDto { friends: [{ id, displayName, activity? }], tracks }`: everyone the caller follows (the 200 most recent), those with activity first, newest first, then the rest by name. `activity { mediaItemId, playing, atEpochMs }`; `tracks` resolves the items |

`UserSettingsDto` gains optional `shareActivity`; a client that omits it leaves it unchanged.

### Kafka

`library.events.v1` gains a fourth shape: `{ user_id, action: followed_user | unfollowed_user,
followee_id }`, written in the follow's transaction. Consumers that switch on `action` must
tolerate the new values, as the topic's compatibility rule already requires.

## Decisions

- **Only a name and the last item leave an account.** Never an email, never history. Search and
  profiles show display names only.
- **Private session and the setting are enforced on both sides.** Activity is written only outside a
  private session and with sharing on (inside the upsert, from `user_settings`), and every read
  filters on both again. Turning on a private session or turning sharing off *deletes* the row, so
  turning it back on reveals nothing played in between. Clearing history clears it too. This is the
  contract invariant ("private events are excluded from the friend-activity feed") made concrete.
- **Sharing is on by default**, as in the reference client. Settings explains it, and both the
  panel and the Friends page say when you are not sharing.
- **No playlists on profiles yet.** Every playlist is `is_public` by default only because the column
  predates any way to choose. Showing them would publish what nobody agreed to publish.
- **One-way follows, no approval**, as in the reference client. Blocking is a follow-up.
- **Now playing without a heartbeat.** The web player reports `play_started` and then
  `play_completed` or `skipped`, nothing in between. `playing` runs from the start until the end
  event, and the gateway also ends it one minute past the item's duration, so a closed tab does not
  stay "listening" for ever. An end event only ends the row if it is still for that item, because the
  old song's end and the next one's start are sent together and can arrive in either order.
- **Postgres, not Redis.** One indexed query per open app per minute (the client polls) is cheap at
  this size; `a:friendfeed` stays reserved for when it is not.

## Verification

On the native-Postgres local stack, against the running gateway, with three throwaway listeners:
search found the other two by name and not the caller, an exact name first, `f` **400**, `%%` matched
nothing, `limit=99` **400**, no email anywhere in the response; follow, self-follow **400**, unknown
**404**, profile counts and `followsMe` both ways; activity appeared on `play_started`, survived the
previous song's late `skipped`, ended on `play_completed`; private session hid and deleted it and
nothing played in private appeared after; sharing off hid it and plays while off never appeared;
clearing history removed it; `playing` turned false once the item's duration plus a minute had
passed; unfollow removed the person; each follow and unfollow wrote one `library.events.v1` row (the
two examples are real rows). In headless Chrome driven by REA at 1600 px: a new listener signed up,
searched "friendtest" in the panel, followed one, and saw them listening now to *Great Is Thy
Faithfulness*; the profile page showed counts and Following; at 390 px the Friends page showed the same
list from the sidebar menu.
