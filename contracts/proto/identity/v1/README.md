# `identity.v1` — DEFERRED

**Status: DEFERRED. No `.proto` is defined, on purpose.** Owner when it exists: workstream A.

There is one deployable (`gateway`) and four in-process library modules that depend only on `contracts`. No network boundary exists between any of them, so a wire format here would describe calls that nothing makes. The plan's day-zero rule is that every workstream consumes the contracts repo rather than defining its own types; for this service that consumption is the Java interface listed below, until a boundary exists.

**Why not now, specifically:** identity is the resolver on every request; a network hop here would be on the hot path of every call.

## Planned RPCs (plan §1 day 3) and what backs each one today

| RPC | Backed by | Status |
|---|---|---|
| `ValidateToken` | Spring Security resource server + `CurrentUserArgumentResolver.current` (validates the JWT, provisions the user) | implemented in-process |
| `GetUser` | `UserService.require` + `UserService.toDto`; REST `GET /v1/me` | implemented in-process |
| `GetUserSettings` | `UserService.getSettings`; REST `GET /v1/settings` | implemented in-process |
| `UpdateUserSettings` | `UserService.updateSettings`; REST `PUT /v1/settings` | implemented in-process |

## What triggers writing the proto

1. A second deployable that must call this service — not a module, a process.
2. An RFC (`../../README.md` → *Changing a contract*) that names the caller and the SLA.
3. The `.proto` is written **from the Java signatures above**, and the REST DTOs in `backend/contracts` become its generated types' twins, checked by conformance CI.

Until then, the REST surface in `../../openapi/adventwave.yaml` is the only public contract, and browsers cannot speak gRPC without a translating proxy in any case.
