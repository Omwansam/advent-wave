# `library.v1` — DEFERRED

**Status: DEFERRED. No `.proto` is defined, on purpose.** Owner when it exists: workstream A.

There is one deployable (`gateway`) and four in-process library modules that depend only on `contracts`. No network boundary exists between any of them, so a wire format here would describe calls that nothing makes. The plan's day-zero rule is that every workstream consumes the contracts repo rather than defining its own types; for this service that consumption is the Java interface listed below, until a boundary exists.

**Why not now, specifically:** every mutation here writes an outbox row in the caller's transaction; a remote call would need a distributed transaction or the outbox moves with it.

## Planned RPCs (plan §1 day 3) and what backs each one today

| RPC | Backed by | Status |
|---|---|---|
| `GetLibrary` | `LibraryService.snapshot` + `LibraryAssembler`; REST `GET /v1/library` | implemented in-process |
| `ToggleLike` | `LibraryService.toggleLike(userId, itemId, collection)`; REST `PUT /v1/library/likes/{id}` | implemented in-process |
| `ToggleFollowArtist` | `LibraryService.toggleFollowArtist` | implemented in-process |
| `ToggleFollowPlaylist` | `LibraryService.toggleFollowPlaylist` | implemented in-process |
| `CreatePlaylist` | `LibraryService.createPlaylist`; REST `POST /v1/playlists` | implemented in-process |
| `AddToPlaylist` | `LibraryService.addToPlaylist`; REST `PUT /v1/playlists/{id}/items` | implemented in-process |
| `GetPlayerState` | `PlayerStateService.get` (Redis buffer, then Postgres); REST `GET /v1/player-state` | implemented in-process |
| `SavePlayerState` | `PlayerStateService.save` (Redis write-buffer, 30s flush); REST `PUT /v1/player-state` | implemented in-process |

## What triggers writing the proto

1. A second deployable that must call this service — not a module, a process.
2. An RFC (`../../README.md` → *Changing a contract*) that names the caller and the SLA.
3. The `.proto` is written **from the Java signatures above**, and the REST DTOs in `backend/contracts` become its generated types' twins, checked by conformance CI.

Until then, the REST surface in `../../openapi/adventwave.yaml` is the only public contract, and browsers cannot speak gRPC without a translating proxy in any case.
