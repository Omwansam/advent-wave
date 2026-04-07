import {
  recommendationMetaById,
  DEFAULT_SONG_META,
} from '../data/recommendationMeta.js'

const REGION_LABEL = {
  kenya: 'Kenya & East Africa',
  global: 'Worldwide',
}

export function enrichSongCatalog(songs) {
  return songs.map((s) => ({
    ...s,
    ...(recommendationMetaById[s.id] || DEFAULT_SONG_META),
  }))
}

/** True if items already carry mock genre/language/region (e.g. after enrich). */
function catalogIsTagged(s) {
  return Boolean(s?.genre && s?.language && s?.region)
}

/**
 * Mock “smart” recommendations from listening taste (no backend).
 *
 * @param {object} user - `{ likedRecordIds?, recentRecordIds?, followedArtistNames? }` — also accepts `likedSongIds` / `recentTrackIds` from the library store.
 * @param {object[]} songs - music catalog (any items with `id`, `artist`, …)
 * @param {object[]} playlists - `{ id, title, songIds, ... }[]` curated + user
 * @returns {{
 *   recommendedSongs: object[],
 *   recommendedPlaylists: object[],
 *   becauseYouListened: null | { artistName: string, songs: object[] },
 *   trendingInRegion: { label: string, region: string, songs: object[] },
 * }}
 */
export function getRecommendations(user, songs, playlists) {
  const likedSongIds = user?.likedSongIds ?? user?.likedRecordIds ?? []
  const recentTrackIds = user?.recentTrackIds ?? user?.recentRecordIds ?? []
  const followedArtistNames = user?.followedArtistNames ?? []

  const enriched =
    songs.length > 0 && catalogIsTagged(songs[0])
      ? songs
      : enrichSongCatalog(songs)

  const byId = new Map(enriched.map((s) => [s.id, s]))
  const likedSet = new Set(likedSongIds)

  const seeds = []
  const seenSeed = new Set()
  for (const id of recentTrackIds) {
    const s = byId.get(id)
    if (s && !seenSeed.has(s.id)) {
      seeds.push(s)
      seenSeed.add(s.id)
    }
  }
  for (const id of likedSongIds) {
    const s = byId.get(id)
    if (s && !seenSeed.has(s.id)) {
      seeds.push(s)
      seenSeed.add(s.id)
    }
  }

  const seedArtists = new Set(seeds.map((s) => s.artist))
  followedArtistNames.forEach((n) => {
    if (n) seedArtists.add(n)
  })

  const seedGenres = new Set(seeds.map((s) => s.genre).filter(Boolean))
  const seedLangs = new Set(seeds.map((s) => s.language).filter(Boolean))
  const seedRegions = new Set(seeds.map((s) => s.region).filter(Boolean))

  for (const s of enriched) {
    if (followedArtistNames.includes(s.artist)) {
      seedGenres.add(s.genre)
      seedLangs.add(s.language)
      seedRegions.add(s.region)
    }
  }

  const scoreSong = (s) => {
    if (likedSet.has(s.id)) return -1
    let score = 0
    if (seedArtists.has(s.artist)) score += 48
    if (s.genre && seedGenres.has(s.genre)) score += 32
    if (s.language && seedLangs.has(s.language)) score += 26
    if (s.region && seedRegions.has(s.region)) score += 22
    if (followedArtistNames.includes(s.artist)) score += 36
    score += (s.popularity ?? 60) * 0.12
    return score
  }

  const scored = enriched
    .map((s) => ({ s, score: scoreSong(s) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  let recommendedSongs = scored.map(({ s }) => s)
  const picked = new Set(recommendedSongs.map((s) => s.id))

  const popularFill = [...enriched]
    .filter((s) => !likedSet.has(s.id) && !picked.has(s.id))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))

  for (const s of popularFill) {
    if (recommendedSongs.length >= 18) break
    recommendedSongs.push(s)
    picked.add(s.id)
  }

  recommendedSongs = recommendedSongs.slice(0, 18)

  const scorePl = (pl) => {
    let score = 0
    const ids = pl.songIds ?? []
    for (const id of ids) {
      if (likedSet.has(id)) score += 4
      const track = byId.get(id)
      if (!track) continue
      if (seedGenres.has(track.genre)) score += 2
      if (seedLangs.has(track.language)) score += 2
      if (seedRegions.has(track.region)) score += 2
      if (seedArtists.has(track.artist)) score += 3
    }
    score += Math.min(10, ids.length * 0.45)
    return score
  }

  const plScored = [...playlists]
    .map((p) => ({ p, score: scorePl(p) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  let recommendedPlaylists = plScored.map(({ p }) => p).slice(0, 8)

  if (recommendedPlaylists.length < 3) {
    const extras = playlists.filter(
      (p) => !recommendedPlaylists.some((x) => x.id === p.id),
    )
    recommendedPlaylists = [
      ...recommendedPlaylists,
      ...extras.slice(0, 4),
    ]
  }

  recommendedPlaylists = recommendedPlaylists.slice(0, 6)

  const spotlightSource =
    recentTrackIds.map((id) => byId.get(id)).find(Boolean) ||
    likedSongIds.map((id) => byId.get(id)).find(Boolean)

  let becauseYouListened = null
  if (spotlightSource) {
    const name = spotlightSource.artist
    let becauseSongs = enriched.filter(
      (s) =>
        s.artist === name &&
        !likedSet.has(s.id) &&
        s.id !== spotlightSource.id,
    )
    if (becauseSongs.length === 0 && spotlightSource.genre) {
      becauseSongs = enriched.filter(
        (s) =>
          s.genre === spotlightSource.genre &&
          !likedSet.has(s.id) &&
          s.id !== spotlightSource.id,
      )
    }
    if (becauseSongs.length > 0) {
      becauseYouListened = {
        artistName: name,
        songs: becauseSongs.slice(0, 12),
      }
    }
  }

  const regionCounts = new Map()
  seeds.forEach((s) => {
    const r = s.region || 'global'
    regionCounts.set(r, (regionCounts.get(r) || 0) + 1)
  })
  let dominantRegion = 'kenya'
  if (regionCounts.size > 0) {
    dominantRegion = [...regionCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0][0]
  } else if (seedRegions.size > 0) {
    dominantRegion = [...seedRegions][0]
  }

  const trendingInRegion = {
    label: REGION_LABEL[dominantRegion] || REGION_LABEL.global,
    region: dominantRegion,
    songs: [...enriched]
      .filter((s) => (s.region || 'global') === dominantRegion)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 14),
  }

  return {
    recommendedSongs,
    recommendedPlaylists,
    becauseYouListened,
    trendingInRegion,
  }
}
