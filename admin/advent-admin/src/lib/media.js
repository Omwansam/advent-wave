/**
 * Catalogue vocabulary, kept in one place. The values mirror the CHECK constraints in
 * contracts/postgres/schema.sql and the ladder in contracts/audio/transcode.md.
 */

export const MEDIA_TYPES = ['song', 'sermon', 'podcast']

export const MEDIA_TYPE_LABEL = {
  song: 'Song',
  sermon: 'Sermon',
  podcast: 'Podcast',
}

/** media_items_status_check, in lifecycle order. */
export const MEDIA_STATUSES = ['draft', 'processing', 'published', 'withdrawn', 'failed']

/** churches_consent_status_check. */
export const CHURCH_CONSENT_STATUSES = ['none', 'pending', 'granted', 'revoked']

/** licenses_consent_status_check. Only `granted` lets an item publish. */
export const LICENSE_STATUSES = ['pending', 'granted', 'revoked', 'expired']

/**
 * The upload endpoint's allowlist. It decides; this copy only lets the file picker say no
 * before a draft is created for a file that would be refused.
 */
export const MASTER_EXTENSIONS = [
  'wav', 'flac', 'aif', 'aiff', 'mp3', 'm4a', 'aac', 'ogg', 'opus', 'mp4', 'mov', 'webm',
]

/** Accepted, but the worker flags them `lossy_master`. */
export const LOSSY_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'mp4', 'mov', 'webm']

export const LOSSY_WARNING = 'Lossy masters are accepted and flagged. Ask the church for WAV or FLAC.'

export const MASTER_ACCEPT = MASTER_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export function extensionOf(filename) {
  const match = /\.([^./\\]+)$/.exec(filename || '')
  return match ? match[1].toLowerCase() : ''
}

export function isAllowedMaster(filename) {
  return MASTER_EXTENSIONS.includes(extensionOf(filename))
}

export function isLossyMaster(filename) {
  return LOSSY_EXTENSIONS.includes(extensionOf(filename))
}

/** Where the upload endpoint puts a master: masters/{id}/original.{ext}. */
export function masterKeyFor(mediaItemId, filename) {
  return `masters/${mediaItemId}/original.${extensionOf(filename)}`
}

/** Review flags from the transcode worker, in words an editor acts on. */
export const FLAG_TEXT = {
  lossy_master: {
    title: 'Lossy master',
    detail: 'The master was already compressed (MP3, AAC, video audio…). It plays, but ask the church for a WAV or FLAC and re-ingest when it arrives.',
  },
  long_leading_silence: {
    title: 'Long silence at the start',
    detail: 'The recording opens with a long stretch of silence. Listen to the start: it may be a deliberate pause, or the master may need re-cutting at source. Nothing was trimmed.',
  },
  long_trailing_silence: {
    title: 'Long silence at the end',
    detail: 'The recording ends with a long stretch of silence. Listen to the end before publishing. Nothing was trimmed.',
  },
}

export function describeFlag(flag) {
  return FLAG_TEXT[flag] ?? { title: flag.replaceAll('_', ' '), detail: 'A review flag from the transcode worker.' }
}

/** Ladder order for display, lowest bitrate first. */
export const PROFILE_ORDER = ['aac_24_hev2', 'aac_64', 'aac_96', 'aac_128', 'aac_160', 'aac_320']

export function sortProfiles(profiles) {
  return [...profiles].sort((a, b) => {
    const ia = PROFILE_ORDER.indexOf(a)
    const ib = PROFILE_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })
}

/** How long an item may sit in processing before the dashboard calls it stuck. */
export const STUCK_PROCESSING_MS = 30 * 60 * 1000

export function hasStoredOutputs(item) {
  return Boolean(item?.assets?.length)
}

export function reviewFlagsOf(item) {
  return Array.isArray(item?.reviewFlags) ? item.reviewFlags : []
}
