export function formatDurationMs(ms) {
  if (ms == null || Number.isNaN(ms)) return '—'
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = s.toString().padStart(2, '0')
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** "m:ss" or "h:mm:ss" (or plain seconds) to milliseconds; null if it does not parse. */
export function parseDuration(text) {
  const parts = String(text || '').trim().split(':')
  if (!parts.length || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  const seconds = parts.reduce((acc, p) => acc * 60 + Number(p), 0)
  return seconds > 0 ? Math.round(seconds * 1000) : null
}

export function formatBytes(bytes) {
  if (bytes == null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelative(iso, now = Date.now()) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const seconds = Math.round((then - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day')
  return formatDate(iso)
}

export function formatDb(value, unit = 'dB') {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} ${unit}`
}

/**
 * The gain a listener's player applies: toward −14 LUFS, attenuation only. Quiet masters are
 * never boosted (that would need a limiter, and the audio rules forbid re-processing).
 */
export function listenerGainDb(loudnessLufs) {
  if (loudnessLufs == null) return null
  return Math.min(0, -14 - loudnessLufs)
}

/** A date input's value (YYYY-MM-DD) as the end of that day in UTC, for Instant.parse. */
export function endOfDayInstant(dateValue) {
  return dateValue ? `${dateValue}T23:59:59Z` : undefined
}

export function shortId(id) {
  return id ? id.slice(0, 8) : ''
}
