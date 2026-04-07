/**
 * Higher score = better match. -1 = no match.
 * Exact → prefix → substring (earlier index scores higher).
 */
export function matchScore(text, query) {
  if (!query || text == null) return -1
  const h = String(text).toLowerCase()
  const qq = String(query).toLowerCase().trim()
  if (!qq) return -1
  if (h === qq) return 10_000
  if (h.startsWith(qq)) return 8_000 + Math.min(500, Math.max(0, 200 - h.length))
  const idx = h.indexOf(qq)
  if (idx >= 0) return 6_000 - Math.min(idx, 500)
  return -1
}

export function bestTrackScores(track, query) {
  const a = matchScore(track.title, query)
  const b = matchScore(track.artist, query)
  const c = track.album ? matchScore(track.album, query) : -1
  return Math.max(a, b, c)
}

export function isKenyaQuery(query) {
  const q = String(query).toLowerCase()
  return (
    q.includes('kenya') ||
    q.includes('kisumu') ||
    q.includes('nairobi') ||
    q.includes('mombasa') ||
    q.includes('swahili') ||
    q.includes('cosacow') ||
    q.includes('eldoret') ||
    q.includes('nakuru')
  )
}
