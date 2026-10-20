/**
 * Sermons and podcasts are listened to differently from songs: often in more than one
 * sitting, sometimes faster than recorded. Songs are neither — a hymn at 1.5× is not the
 * hymn, and the congregation singing along is part of what was licensed — so speed and
 * resume apply to these two types only.
 */
export function isLongForm(track) {
  return track?.mediaType === 'sermon' || track?.mediaType === 'podcast'
}

/** The speeds offered, slowest first. 1 must stay in the list: it is the reset. */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2]

export function formatRate(rate) {
  return `${Number(rate.toFixed(2))}×`
}

/** "End of sermon" reads better than "End of track" when a sermon is what is playing. */
export function itemNoun(track) {
  if (track?.mediaType === 'sermon') return 'sermon'
  if (track?.mediaType === 'podcast') return 'episode'
  return 'song'
}
