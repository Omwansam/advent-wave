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
