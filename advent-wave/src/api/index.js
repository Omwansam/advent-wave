/**
 * One function per operation in backend/contracts/openapi/adventwave.yaml.
 *
 * This module is the only place in the app that knows a URL. Pages and stores call these
 * functions; when the spec changes, this file is what changes with it. Regenerate the spec
 * with `backend/tools/dump-openapi.sh` and diff it against these calls.
 */
import { api } from './client'

export { ApiError } from './client'

/* -------------------------------------------------------------- auth */

/**
 * Exchanges an email for a bearer token. The dev issuer verifies no credential — it stands
 * in for the managed IdP that has not been chosen yet (plan §1 pre-work), so the password
 * collected by the login form is not sent anywhere.
 */
export function createSession(email, name) {
  return api.post('/v1/auth/session', { email, name }, { auth: false })
}

/* -------------------------------------------------------------- me */

export function getMe(options) {
  return api.get('/v1/me', options)
}

export function getSettings(options) {
  return api.get('/v1/settings', options)
}

export function updateSettings(settings, options) {
  return api.put('/v1/settings', settings, options)
}

/* -------------------------------------------------------------- catalogue */

export function getHome(options) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return api.get('/v1/home', { ...options, query: { tz } })
}

export function getDiscover(cat, options) {
  return api.get('/v1/discover', { ...options, query: { cat } })
}

export function getBrowse(options) {
  return api.get('/v1/browse', options)
}

export function getMedia(id, options) {
  return api.get(`/v1/media/${id}`, options)
}

/**
 * Resolves many ids in one request, in the order given. The library, history and player
 * state all hand back ids; this is what turns them into tracks. Capped at 200 ids server-side.
 */
export function getMediaBatch(ids, options) {
  const list = [...new Set((ids || []).filter(Boolean))]
  if (!list.length) return Promise.resolve([])
  return api.get('/v1/media', { ...options, query: { ids: list.join(',') } })
}

export function getArtist(id, options) {
  return api.get(`/v1/artists/${id}`, options)
}

export function getAlbum(id, options) {
  return api.get(`/v1/albums/${id}`, options)
}

/**
 * The playback manifest: loudness, the profile ladder, and one short-lived signed URL for
 * the selected profile. Never cache `audioUrl` — it expires (plan §11.8).
 */
export function getStreamManifest(id, options) {
  return api.get(`/v1/media/${id}/stream`, options)
}

/* -------------------------------------------------------------- search */

export function search(q, options) {
  return api.get('/v1/search', { ...options, query: { q } })
}

/* -------------------------------------------------------------- library */

export function getLibrary(options) {
  return api.get('/v1/library', options)
}

/**
 * One toggle for songs and sermons both: the server routes to liked_songs or saved_sermons
 * by the item's media_type, so the client does not need to know which it is.
 */
export function toggleLike(mediaItemId, options) {
  return api.put(`/v1/library/likes/${mediaItemId}`, undefined, options)
}

export function toggleFollowArtist(artistId, options) {
  return api.put(`/v1/library/follows/artist/${artistId}`, undefined, options)
}

export function toggleFollowPlaylist(playlistId, options) {
  return api.put(`/v1/library/follows/playlist/${playlistId}`, undefined, options)
}

export function getHistory(options) {
  return api.get('/v1/history', options)
}

export function clearHistory(options) {
  return api.del('/v1/history', options)
}

/* -------------------------------------------------------------- playlists */

/** Curated playlists plus the caller's own, with tracks resolved. */
export function getPlaylists(options) {
  return api.get('/v1/playlists', options)
}

export function getPlaylist(id, options) {
  return api.get(`/v1/playlists/${id}`, options)
}

export function createPlaylist({ title, description, cover }, options) {
  return api.post('/v1/playlists', { title, description, cover }, options)
}

export function addPlaylistItems(id, mediaItemIds, options) {
  return api.put(`/v1/playlists/${id}/items`, { mediaItemIds }, options)
}

export function removePlaylistItem(id, mediaItemId, options) {
  return api.del(`/v1/playlists/${id}/items/${mediaItemId}`, options)
}

export function updatePlaylist(id, { title, description }, options) {
  return api.patch(`/v1/playlists/${id}`, { title, description }, options)
}

export function deletePlaylist(id, options) {
  return api.del(`/v1/playlists/${id}`, options)
}

/* -------------------------------------------------------------- player state */

export function getPlayerState(options) {
  return api.get('/v1/player-state', options)
}

export function savePlayerState(state, options) {
  return api.put('/v1/player-state', state, options)
}

/* -------------------------------------------------------------- recommendations */

export function getRecommendations(options) {
  return api.get('/v1/recommendations', options)
}

/* -------------------------------------------------------------- events */

/**
 * Playback telemetry. The server decides what counts as a play (>=30s or >=50% of the item)
 * and honours the user's private-session setting — the client does not get a vote on either.
 */
export function sendPlaybackEvent(event, options) {
  return api.post('/v1/events/playback', event, options)
}
