# `search.v1` — DEFERRED

**Status: DEFERRED. No `.proto` is defined, on purpose.** Owner when it exists: workstream B.

There is one deployable (`gateway`) and four in-process library modules that depend only on `contracts`. No network boundary exists between any of them, so a wire format here would describe calls that nothing makes. The plan's day-zero rule is that every workstream consumes the contracts repo rather than defining its own types; for this service that consumption is the Java interface listed below, until a boundary exists.

**Why not now, specifically:** the boundary appears when Elasticsearch does — the engine swap is the natural moment to split the service.

## Planned RPCs (plan §1 day 3) and what backs each one today

| RPC | Backed by | Status |
|---|---|---|
| `Search` | `SearchService.search(query, playlists)` → `SearchResultsDto` — shape mirrors the client's `searchCatalogFull()` exactly; ranking ported from `searchRank.js` incl. the Kenya boost; REST `GET /v1/search?q=` | implemented in-process (Postgres ILIKE + trigram; Elasticsearch is the planned engine) |

## What triggers writing the proto

1. A second deployable that must call this service — not a module, a process.
2. An RFC (`../../README.md` → *Changing a contract*) that names the caller and the SLA.
3. The `.proto` is written **from the Java signatures above**, and the REST DTOs in `backend/contracts` become its generated types' twins, checked by conformance CI.

Until then, the REST surface in `../../openapi/adventwave.yaml` is the only public contract, and browsers cannot speak gRPC without a translating proxy in any case.
