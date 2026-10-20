export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '0:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** "1 hr 5 min left", "12 min left", "Less than a minute left". */
export function formatTimeLeft(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  if (s < 60) return 'Less than a minute left'
  const totalMin = Math.round(s / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min left`
  return m === 0 ? `${h} hr left` : `${h} hr ${m} min left`
}

/** "now", "5 min", "3 h", "2 d", "6 w": how long ago, as the friend activity panel shows it. */
export function formatAgo(epochMs, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - epochMs) / 60000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return `${Math.floor(days / 7)} w`
}
