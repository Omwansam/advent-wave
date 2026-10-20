/**
 * One function per admin operation in contracts/openapi/adventwave.yaml.
 *
 * This module is the only place in the app that knows a URL. Pages call these functions;
 * when the spec changes, this file is what changes with it.
 *
 * Operations marked "RFC 0001" are the admin-portal additions (upload, preview, album and
 * licence lists, the mediaType and q filters). A gateway without them answers 404 or 405, and
 * the page shows that refusal like any other.
 */
import { api } from './client'

export { ApiError } from './client'

/* -------------------------------------------------------------- auth */

/**
 * Admin sign-in: email and password. Returns `{ token, tokenType, expiresIn, account }`.
 * 401 for a wrong email or password (it never says which), 403 for a disabled account,
 * 429 while the account is locked after repeated failures.
 */
export function signIn(email, password, options) {
  return api.post('/v1/auth/admin/login', { email, password }, { ...options, auth: false })
}

/* -------------------------------------------------------------- my account */

/** The signed-in account as stored now: role, permissions, whether the password must change. */
export function getMe(options) {
  return api.get('/v1/admin/me', options)
}

/** Ends every session of this account and returns a new one: `{ token, ..., account }`. */
export function changeMyPassword(currentPassword, newPassword, options) {
  return api.post('/v1/admin/me/password', { currentPassword, newPassword }, options)
}

/** Ends every session of this account, on every device. */
export function signOutEverywhere(options) {
  return api.post('/v1/admin/me/sign-out', undefined, options)
}

/* -------------------------------------------------------------- staff accounts (admins:manage) */

export function listAccounts(options) {
  return api.get('/v1/admin/accounts', options)
}

/** @param {{ email: string, displayName: string, role: string, temporaryPassword: string }} account */
export function createAccount(account, options) {
  return api.post('/v1/admin/accounts', account, options)
}

/** @param {{ displayName?: string, role?: string, active?: boolean }} patch */
export function updateAccount(id, patch, options) {
  return api.patch(`/v1/admin/accounts/${id}`, patch, options)
}

export function resetAccountPassword(id, temporaryPassword, options) {
  return api.post(`/v1/admin/accounts/${id}/password`, { temporaryPassword }, options)
}

/* -------------------------------------------------------------- churches */

export function listChurches(options) {
  return api.get('/v1/admin/churches', options)
}

export function getChurch(id, options) {
  return api.get(`/v1/admin/churches/${id}`, options)
}

/** @param {{ name: string, country?: string, region?: string, contactEmail?: string }} church */
export function createChurch(church, options) {
  return api.post('/v1/admin/churches', church, options)
}

export function updateChurch(id, church, options) {
  return api.put(`/v1/admin/churches/${id}`, church, options)
}

/** @param {'none' | 'pending' | 'granted' | 'revoked'} consentStatus */
export function setChurchConsent(id, consentStatus, options) {
  return api.put(`/v1/admin/churches/${id}/consent`, { consentStatus }, options)
}

/* -------------------------------------------------------------- licences */

export function listChurchLicenses(churchId, options) {
  return api.get(`/v1/admin/churches/${churchId}/licenses`, options)
}

/** RFC 0001. Every licence across churches, optionally by status. */
export function listLicenses(status, options) {
  return api.get('/v1/admin/licenses', { ...options, query: { status } })
}

export function getLicense(id, options) {
  return api.get(`/v1/admin/licenses/${id}`, options)
}

/**
 * @param {{ churchId: string, territory?: string, expiresAt?: string,
 *           revenueSharePct?: number, consentDocumentUrl?: string }} license
 */
export function createLicense(license, options) {
  return api.post('/v1/admin/licenses', license, options)
}

/** @param {'pending' | 'granted' | 'revoked' | 'expired'} consentStatus */
export function setLicenseStatus(id, consentStatus, options) {
  return api.put(`/v1/admin/licenses/${id}/status`, { consentStatus }, options)
}

/* -------------------------------------------------------------- artists */

export function listArtists(options) {
  return api.get('/v1/admin/artists', options)
}

export function getArtist(id, options) {
  return api.get(`/v1/admin/artists/${id}`, options)
}

/**
 * @param {{ name: string, slug?: string, coverUrl?: string, bio?: string,
 *           churchId?: string, verified?: boolean }} artist
 */
export function createArtist(artist, options) {
  return api.post('/v1/admin/artists', artist, options)
}

/** A full replace: send every field, not just the changed ones. */
export function updateArtist(id, artist, options) {
  return api.put(`/v1/admin/artists/${id}`, artist, options)
}

/* -------------------------------------------------------------- albums */

/** RFC 0001. */
export function listAlbums(artistId, options) {
  return api.get('/v1/admin/albums', { ...options, query: { artistId } })
}

export function getAlbum(id, options) {
  return api.get(`/v1/admin/albums/${id}`, options)
}

/** @param {{ title: string, artistId: string, coverUrl?: string, releaseDate?: string }} album */
export function createAlbum(album, options) {
  return api.post('/v1/admin/albums', album, options)
}

/** Partial: omitted fields are left as they are. */
export function updateAlbum(id, album, options) {
  return api.patch(`/v1/admin/albums/${id}`, album, options)
}

/* -------------------------------------------------------------- media items */

/**
 * Any status, newest-updated first. `limit` caps at 500 server-side. `mediaType` and `q` are
 * RFC 0001; callers also filter on them locally so an older gateway still gives right answers.
 *
 * @param {{ status?: string, mediaType?: string, q?: string, limit?: number }} [filters]
 */
export function listMedia(filters = {}, options) {
  const { status, mediaType, q, limit = 500 } = filters
  return api.get('/v1/admin/media', { ...options, query: { status, mediaType, q, limit } })
}

export function getMediaItem(id, options) {
  return api.get(`/v1/admin/media/${id}`, options)
}

/** Creates a draft. `durationMs` must be at least 1; the worker overwrites it with the measured value. */
export function createMediaItem(item, options) {
  return api.post('/v1/admin/media', item, options)
}

/** Partial update of metadata. Status changes through its own operations, never here. */
export function updateMediaItem(id, patch, options) {
  return api.patch(`/v1/admin/media/${id}`, patch, options)
}

/**
 * RFC 0001. Asks for somewhere to put the master. Returns
 * `{ uploadUrl, method: 'PUT', masterStorageKey, expiresAt }`; the file itself goes to
 * `uploadUrl` with `putFile`, never through this API.
 */
export function requestUpload(id, { filename, contentType, sizeBytes }, options) {
  return api.post(`/v1/admin/media/${id}/upload`, { filename, contentType, sizeBytes }, options)
}

/** draft | failed → processing, and emits audio.transcode.v1 `requested`. */
export function requestTranscode(id, masterStorageKey, options) {
  return api.post(`/v1/admin/media/${id}/transcode`, { masterStorageKey }, options)
}

/** → published, if there is something to play and the licence is granted. The database has the last word. */
export function publishMediaItem(id, options) {
  return api.post(`/v1/admin/media/${id}/publish`, undefined, options)
}

/** published → withdrawn. Assets and master stay. */
export function withdrawMediaItem(id, options) {
  return api.post(`/v1/admin/media/${id}/withdraw`, undefined, options)
}

/** RFC 0001. `{ [profile]: url }` for every stored asset, whatever the item's status. */
export function getMediaPreview(id, options) {
  return api.get(`/v1/admin/media/${id}/preview`, options)
}

/* -------------------------------------------------------------- lyrics & chapters (RFC 0004) */

/** A song's lyrics at any status. 404 when it has none — callers treat that as empty. */
export function getMediaLyrics(id, options) {
  return api.get(`/v1/admin/media/${id}/lyrics`, options)
}

/** Replaces a song's lyrics: `{ lines: [{ startMs?, text }], rightsBasis, credit, language? }`. */
export function saveMediaLyrics(id, lyrics, options) {
  return api.put(`/v1/admin/media/${id}/lyrics`, lyrics, options)
}

/** 204 whether or not there were any. */
export function deleteMediaLyrics(id, options) {
  return api.del(`/v1/admin/media/${id}/lyrics`, options)
}

/** A sermon's or episode's chapters, earliest first; empty when it has none. */
export function getMediaChapters(id, options) {
  return api.get(`/v1/admin/media/${id}/chapters`, options)
}

/** Replaces the chapters; an empty list clears them. */
export function saveMediaChapters(id, chapters, options) {
  return api.put(`/v1/admin/media/${id}/chapters`, { chapters }, options)
}
