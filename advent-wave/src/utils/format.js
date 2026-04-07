export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '0:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
