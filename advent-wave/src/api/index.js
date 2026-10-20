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
 * Local development only: the dev issuer exchanges an email for a token and checks nothing.
 * A server runs with it off (DevDefaultsGuard), and then this answers 404.
 */
export function createSession(email, name) {
  return api.post('/v1/auth/session', { email, name }, { auth: false })
}

/* Listener accounts (RFC 0005). Each signed-in answer is { token, tokenType, expiresIn, user }. */

export function register({ email, password, name }) {
  return api.post('/v1/auth/register', { email, password, name }, { auth: false })
}

export function login(email, password) {
  return api.post('/v1/auth/login', { email, password }, { auth: false })
}

/** 202 whether or not the email has an account. */
export function requestPasswordReset(email) {
  return api.post('/v1/auth/password-reset', { email }, { auth: false })
}

export function confirmPasswordReset(token, newPassword) {
  return api.post('/v1/auth/password-reset/confirm', { token, newPassword }, { auth: false })
}

/** Returns the account, now verified. */
export function verifyEmail(token) {
  return api.post('/v1/auth/verify-email', { token }, { auth: false })
}

/** Ends every session, this one too, and returns a fresh one. */
export function changePassword(currentPassword, newPassword) {
  return api.post('/v1/me/password', { currentPassword, newPassword })
}

export function signOutEverywhere() {
  return api.post('/v1/me/sign-out')
}

export function resendVerification() {
  return api.post('/v1/me/verify-email')
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

/* -------------------------------------------------------------- friends */

/** Listeners by display name (RFC 0007): 2–100 characters, the caller excluded. */
export function searchUsers(q, { limit = 20, ...options } = {}) {
  return api.get('/v1/users', { ...options, query: { q, limit } })
}

/** A listener's public profile: name, counts, and who follows whom. Never an email. */
export function getUserProfile(id, options) {
  return api.get(`/v1/users/${encodeURIComponent(id)}`, options)
}

/** A toggle, like following an artist. */
export function toggleFollowUser(userId, options) {
  return api.put(`/v1/library/follows/user/${encodeURIComponent(userId)}`, undefined, options)
}

/** Everyone the caller follows, with what each last played when they share it. */
export function getFriends(options) {
  return api.get('/v1/friends', options)
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

/* -------------------------------------------------------------- listening progress */

/** Resume points in sermons and podcast episodes, newest first (RFC 0003). */
export function getProgress(options) {
  return api.get('/v1/progress', options)
}

/** The server refuses songs (400) and unpublished items (404). */
export function saveProgress(mediaItemId, { positionMs, completed }, options) {
  return api.put(`/v1/progress/${encodeURIComponent(mediaItemId)}`, { positionMs, completed }, options)
}

/* -------------------------------------------------------------- lyrics, chapters, autoplay */

/** A song's words (RFC 0004). 404 means it has none — callers treat that as empty, not an error. */
export function getLyrics(mediaItemId, options) {
  return api.get(`/v1/media/${encodeURIComponent(mediaItemId)}/lyrics`, options)
}

/** A sermon's or episode's chapters; an empty list when it has none. */
export function getChapters(mediaItemId, options) {
  return api.get(`/v1/media/${encodeURIComponent(mediaItemId)}/chapters`, options)
}

/** What to play when the queue runs out, most like the seeds first (1–10 seeds). */
export function getAutoplay(seedIds, { limit = 10, ...options } = {}) {
  return api.get('/v1/autoplay', { ...options, query: { seed: seedIds.join(','), limit } })
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
