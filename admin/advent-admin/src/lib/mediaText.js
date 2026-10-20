/**
 * The text formats the lyrics and chapters editors use (RFC 0004). Editors type plain text; these
 * turn it into what the API takes and back, and say what is wrong before the server has to.
 *
 * Lyrics: one line per line, a blank line between verses. Synced lyrics start every line with
 * its time, LRC style: `[0:14.5] I once was lost, but now am found;`. A blank line that is part
 * of the timing is just its time: `[0:24]`.
 *
 * Chapters: one per line, time then title: `12:30 Scripture reading`, `1:02:03 Appeal`.
 */

const LRC_LINE = /^\[(\d+(?::\d{1,2}){1,2}(?:\.\d+)?)\]\s?(.*)$/
const CHAPTER_LINE = /^(\d+(?::\d{1,2}){1,2}(?:\.\d+)?)\s+(.+)$/

/** "m:ss", "m:ss.s" or "h:mm:ss" to milliseconds; null if it does not parse. Zero is valid. */
export function parseTimestamp(text) {
  const parts = String(text ?? '').trim().split(':')
  if (parts.length < 2 || parts.length > 3) return null
  if (parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  if (parts.slice(1).some((p) => Number(p) >= 60)) return null
  return Math.round(parts.reduce((acc, p) => acc * 60 + Number(p), 0) * 1000)
}

/** Milliseconds to "m:ss", with tenths when they are not zero, and hours when needed. */
export function formatTimestamp(ms) {
  const tenths = Math.round(ms / 100)
  const totalSec = Math.floor(tenths / 10)
  const frac = tenths % 10
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const ss = `${s.toString().padStart(2, '0')}${frac ? `.${frac}` : ''}`
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function splitLines(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines
}

/** @returns {{ lines: { startMs?: number, text: string }[], synced: boolean } | { error: string }} */
export function parseLyricsText(text) {
  const raw = splitLines(text)
  if (!raw.some((l) => l.trim())) return { error: 'Enter the words, one line per line.' }
  if (raw.length > 400) return { error: `${raw.length} lines; at most 400.` }

  const lines = raw.map((r) => {
    const m = r.match(LRC_LINE)
    return m ? { startMs: parseTimestamp(m[1]), text: m[2].trimEnd() } : { text: r.trimEnd() }
  })
  const timed = lines.filter((l) => l.startMs != null).length
  if (timed && timed !== lines.length) {
    const first = lines.findIndex((l) => l.startMs == null) + 1
    return { error: `Once one line has a time every line needs one — line ${first} has none. A blank line in synced lyrics is just its time, e.g. [0:24].` }
  }
  for (let i = 1; timed && i < lines.length; i += 1) {
    if (lines[i].startMs <= lines[i - 1].startMs) {
      return { error: `Line ${i + 1} starts no later than line ${i}.` }
    }
  }
  const tooLong = lines.findIndex((l) => l.text.length > 300)
  if (tooLong >= 0) return { error: `Line ${tooLong + 1} is longer than 300 characters.` }
  return { lines: timed ? lines : lines.map((l) => ({ text: l.text })), synced: timed > 0 }
}

export function lyricsToText(lyrics) {
  return (lyrics?.lines ?? [])
    .map((l) => (l.startMs != null ? `[${formatTimestamp(l.startMs)}]${l.text ? ` ${l.text}` : ''}` : l.text))
    .join('\n')
}

/**
 * @param {number} durationMs the item's duration; 0 when unknown, and then not checked
 * @returns {{ chapters: { startMs: number, title: string }[] } | { error: string }}
 */
export function parseChaptersText(text, durationMs = 0) {
  const raw = splitLines(text).filter((l) => l.trim())
  if (raw.length > 100) return { error: `${raw.length} chapters; at most 100.` }
  const chapters = []
  for (let i = 0; i < raw.length; i += 1) {
    const m = raw[i].trim().match(CHAPTER_LINE)
    const startMs = m ? parseTimestamp(m[1]) : null
    if (startMs == null) return { error: `Line ${i + 1}: start with a time, then the title — e.g. 12:30 Scripture reading.` }
    const title = m[2].trim()
    if (title.length > 120) return { error: `Line ${i + 1}: titles are at most 120 characters.` }
    if (i > 0 && startMs <= chapters[i - 1].startMs) return { error: `Line ${i + 1} starts no later than line ${i}.` }
    if (durationMs > 0 && startMs >= durationMs) return { error: `Line ${i + 1} starts after the recording ends.` }
    chapters.push({ startMs, title })
  }
  return { chapters }
}

export function chaptersToText(chapters) {
  return (chapters ?? []).map((c) => `${formatTimestamp(c.startMs)} ${c.title}`).join('\n')
}

export const RIGHTS_BASIS_OPTIONS = [
  { value: 'public_domain', label: 'Public domain — the words are out of copyright' },
  { value: 'contributor', label: "The contributing church's own words" },
  { value: 'licensed', label: 'Licensed — we hold permission; the credit names the owner' },
]

export const RIGHTS_BASIS_LABEL = {
  public_domain: 'Public domain',
  contributor: 'Contributor’s words',
  licensed: 'Licensed',
}
