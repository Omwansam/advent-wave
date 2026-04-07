import { matchScore, bestTrackScores, isKenyaQuery } from '../utils/searchRank.js'

/** Placeholder streams — swap for CDN URLs in production */
const A = (n) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n % 16) || 16)}.mp3`

const cover = (seed, w = 400) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${w}`

export const songs = [
  {
    id: 's1',
    title: 'Come Thou Fount',
    artist: 'Heritage Singers',
    album: 'Morning Worship',
    duration: 245,
    cover: cover('come-thou'),
    audioUrl: A(1),
  },
  {
    id: 's2',
    title: 'It Is Well',
    artist: 'Adventist Youth Choir',
    album: 'Peace Sessions',
    duration: 312,
    cover: cover('it-is-well'),
    audioUrl: A(2),
  },
  {
    id: 's3',
    title: 'Great Is Thy Faithfulness',
    artist: 'Loma Linda University Church',
    album: 'Hymns Reimagined',
    duration: 278,
    cover: cover('faithfulness'),
    audioUrl: A(3),
  },
  {
    id: 's4',
    title: 'Be Thou My Vision',
    artist: 'Kings Heralds',
    album: 'Celtic Light',
    duration: 201,
    cover: cover('vision'),
    audioUrl: A(4),
  },
  {
    id: 's5',
    title: 'How Great Thou Art',
    artist: 'Oakwood University Aeolians',
    album: 'Live at the Dome',
    duration: 356,
    cover: cover('how-great'),
    audioUrl: A(5),
  },
  {
    id: 's6',
    title: 'Blessed Assurance',
    artist: 'Hope Channel Studio',
    album: 'Quiet Hour',
    duration: 189,
    cover: cover('assurance'),
    audioUrl: A(6),
  },
  {
    id: 's7',
    title: 'In Christ Alone',
    artist: 'Young Adventists Collective',
    album: 'Rise & Sing',
    duration: 267,
    cover: cover('christ-alone'),
    audioUrl: A(7),
  },
  {
    id: 's8',
    title: 'Amazing Grace (Acoustic)',
    artist: 'Sabbath Rest Sessions',
    album: 'Acoustic Vol. 1',
    duration: 224,
    cover: cover('grace-acoustic'),
    audioUrl: A(8),
  },
  {
    id: 's9',
    title: 'The Lord Is My Shepherd',
    artist: 'Instrumental Faith',
    album: 'Strings of Peace',
    duration: 198,
    cover: cover('shepherd'),
    audioUrl: A(9),
  },
  {
    id: 's10',
    title: 'Turn Your Eyes Upon Jesus',
    artist: 'Family Worship Band',
    album: 'Together',
    duration: 241,
    cover: cover('eyes-jesus'),
    audioUrl: A(10),
  },
  {
    id: 's11',
    title: 'Holy, Holy, Holy',
    artist: 'Pacific Union College',
    album: 'Camp Meeting 2024',
    duration: 293,
    cover: cover('holy3'),
    audioUrl: A(11),
  },
  {
    id: 's12',
    title: 'Cornerstone',
    artist: 'Urban Praise',
    album: 'City Lights',
    duration: 255,
    cover: cover('cornerstone'),
    audioUrl: A(12),
  },
  {
    id: 's13',
    title: 'Tumsifu Bwana',
    artist: 'Maxwell SDA Church Choir, Nairobi',
    album: 'Swahili Praise Live',
    duration: 268,
    cover: cover('ke-tumsifu'),
    audioUrl: A(13),
  },
  {
    id: 's14',
    title: 'Jina Lake Yesu',
    artist: 'Kisumu Central SDA Cathedral Praise',
    album: 'Lake Basin Worship',
    duration: 241,
    cover: cover('ke-jina-yesu'),
    audioUrl: A(14),
  },
  {
    id: 's15',
    title: 'Hakuna Mungu Kama Wewe',
    artist: 'COSACOW Nairobi',
    album: 'Voices of the City',
    duration: 302,
    cover: cover('ke-hakuna-mungu'),
    audioUrl: A(15),
  },
  {
    id: 's16',
    title: 'Higher Ground (Live)',
    artist: 'Nyayo Stadium Camp Meeting Choir',
    album: 'Kenya Union Camp 2023',
    duration: 289,
    cover: cover('ke-higher-ground'),
    audioUrl: A(16),
  },
  {
    id: 's17',
    title: 'Nataka Kuimba',
    artist: 'Mombasa Lighthouse SDA Youth',
    album: 'Coast Praise Sessions',
    duration: 226,
    cover: cover('ke-nataka-kuimba'),
    audioUrl: A(1),
  },
  {
    id: 's18',
    title: 'Bwana U Karibu',
    artist: 'Karen SDA Church Worship Team',
    album: 'Evening Light Nairobi',
    duration: 254,
    cover: cover('ke-bwana-karibu'),
    audioUrl: A(2),
  },
  {
    id: 's19',
    title: 'Nearer, My God, to Thee',
    artist: 'Eldoret Central SDA Choir',
    album: 'Rift Valley Hymn Festival',
    duration: 318,
    cover: cover('ke-nearer'),
    audioUrl: A(3),
  },
  {
    id: 's20',
    title: 'Standing on the Promises',
    artist: 'Nakuru Hillcrest SDA Singers',
    album: 'Great Rift Worship',
    duration: 233,
    cover: cover('ke-standing'),
    audioUrl: A(4),
  },
  {
    id: 's21',
    title: "I'll Go Where You Want Me to Go",
    artist: 'Kisii County SDA Youth Mass Choir',
    album: 'Green Hills Sendoff',
    duration: 276,
    cover: cover('ke-ill-go'),
    audioUrl: A(5),
  },
  {
    id: 's22',
    title: 'There Is Power in the Blood',
    artist: 'Thika Road SDA Youth Chorale',
    album: 'Urban Revival Nights',
    duration: 244,
    cover: cover('ke-power-blood'),
    audioUrl: A(6),
  },
  {
    id: 's23',
    title: 'Christ Is Made the Sure Foundation',
    artist: 'Strathmore University SDA Fellowship',
    album: 'Campus Hymns Vol. 2',
    duration: 291,
    cover: cover('ke-foundation'),
    audioUrl: A(7),
  },
  {
    id: 's24',
    title: 'When We All Get to Heaven',
    artist: 'Central Kenya Field Circuit Choir',
    album: 'Sing Until We Reach the Shore',
    duration: 212,
    cover: cover('ke-when-we-all'),
    audioUrl: A(8),
  },
  {
    id: 's25',
    title: 'O How I Love Jesus',
    artist: 'Lake Victoria Gospel Collective',
    album: 'Shores of Faith',
    duration: 198,
    cover: cover('ke-love-jesus'),
    audioUrl: A(9),
  },
  {
    id: 's26',
    title: 'Blessed Assurance (Karen Session)',
    artist: 'Westlands SDA Praise & Worship',
    album: 'Nairobi Nights of Worship',
    duration: 265,
    cover: cover('ke-blessed-karen'),
    audioUrl: A(10),
  },
  {
    id: 's27',
    title: 'Holy Manna',
    artist: 'Ukunda SDA Beach Camp Choir',
    album: 'Coastal Camp Meeting',
    duration: 187,
    cover: cover('ke-holy-manna'),
    audioUrl: A(11),
  },
  {
    id: 's28',
    title: 'Taifa Lako, Bwana (Your Nation, Lord)',
    artist: 'University of Nairobi Adventist Students',
    album: 'Pray for Kenya',
    duration: 259,
    cover: cover('ke-taifa'),
    audioUrl: A(12),
  },
  {
    id: 's29',
    title: 'Mlima wa Mbele',
    artist: 'Kajiado County Bush Camp Choir',
    album: 'Savanna Sabbath Songs',
    duration: 271,
    cover: cover('ke-mlima'),
    audioUrl: A(13),
  },
  {
    id: 's30',
    title: 'We Have This Hope',
    artist: 'Adventist Youth Choir Kenya',
    album: 'East-Central Africa Division Youth',
    duration: 248,
    cover: cover('ke-we-have-hope'),
    audioUrl: A(14),
  },
]

/** Song ids for the Kenya discover filter and playlists */
export const kenyaSongIds = [
  's13',
  's14',
  's15',
  's16',
  's17',
  's18',
  's19',
  's20',
  's21',
  's22',
  's23',
  's24',
  's25',
  's26',
  's27',
  's28',
  's29',
  's30',
]

export const playlists = [
  {
    id: 'p1',
    title: 'Sabbath Morning',
    description: 'Gentle hymns and worship to begin the day in stillness.',
    cover: cover('p-sabbath-morning'),
    songIds: ['s1', 's3', 's6', 's10'],
  },
  {
    id: 'p2',
    title: 'Youth Night Live',
    description: 'High-energy praise from campuses and youth rallies.',
    cover: cover('p-youth-night'),
    songIds: ['s7', 's12', 's5', 's2'],
  },
  {
    id: 'p3',
    title: 'Study & Focus',
    description: 'Instrumental and soft vocals for reading and reflection.',
    cover: cover('p-study'),
    songIds: ['s9', 's4', 's8', 's1'],
  },
  {
    id: 'p4',
    title: 'Choir Spotlight',
    description: 'Featured performances from university and church choirs.',
    cover: cover('p-choir'),
    songIds: ['s5', 's11', 's2', 's6', 's3'],
  },
  {
    id: 'p5',
    title: 'Kenya — Sabbath & streets',
    description:
      'Choirs and praise teams from Nairobi, Kisumu, Mombasa, and the Rift — mock catalogue celebrating Kenya.',
    cover: cover('p-kenya-sabbath'),
    songIds: [
      's13',
      's14',
      's15',
      's16',
      's17',
      's18',
      's28',
      's30',
      's19',
      's20',
    ],
  },
  {
    id: 'p6',
    title: 'Swahili worship picks',
    description: 'Injili na tenzi kwa Kiswahili na mchanganyiko wa kiingereza.',
    cover: cover('p-swahili-worship'),
    songIds: ['s13', 's14', 's15', 's17', 's18', 's28', 's29'],
  },
]

export const discoverCategories = [
  { id: 'worship', label: 'Worship', gradient: 'from-[#6D5DF6]/25 to-[#c9a227]/20', cover: cover('cat-worship') },
  { id: 'youth', label: 'Youth', gradient: 'from-[#5b8def]/25 to-[#6D5DF6]/20', cover: cover('cat-youth') },
  { id: 'instrumental', label: 'Instrumental', gradient: 'from-[#34d399]/20 to-[#6D5DF6]/15', cover: cover('cat-inst') },
  { id: 'choirs', label: 'Choirs', gradient: 'from-[#f472b6]/20 to-[#c9a227]/15', cover: cover('cat-choirs') },
  { id: 'churches', label: 'Churches', gradient: 'from-[#a78bfa]/25 to-[#6D5DF6]/20', cover: cover('cat-churches') },
  {
    id: 'kenya',
    label: 'Kenya',
    gradient: 'from-emerald-500/25 to-amber-500/20',
    cover: cover('cat-kenya'),
  },
]

export const podcastEpisodes = [
  {
    id: 'ep1',
    title: 'Faith on the Front Lines',
    artist: 'Adventist World Radio',
    album: 'Weekly Episode',
    duration: 1842,
    cover: cover('pod-awr'),
    audioUrl: A(13),
  },
  {
    id: 'ep2',
    title: 'Hope Lives Here — Community Stories',
    artist: 'Hope Channel Podcast',
    album: 'Season 4',
    duration: 2205,
    cover: cover('pod-hope'),
    audioUrl: A(14),
  },
  {
    id: 'ep3',
    title: 'Sabbath School Panel: Romans',
    artist: 'Sabbath School Podcast',
    album: 'Book Study',
    duration: 3108,
    cover: cover('pod-ss'),
    audioUrl: A(15),
  },
]

export const sermonTracks = [
  {
    id: 'ser1',
    title: 'Grace That Transforms',
    artist: 'Pastor Dwight Nelson',
    album: 'Pioneer Memorial Church',
    duration: 2580,
    cover: cover('ser-dwight'),
    audioUrl: A(1),
  },
  {
    id: 'ser2',
    title: 'The Rest Remains',
    artist: 'Pastor Mark Finley',
    album: 'Prophecy & Peace',
    duration: 2820,
    cover: cover('ser-finley'),
    audioUrl: A(2),
  },
  {
    id: 'ser3',
    title: 'Walking with Jesus Today',
    artist: 'Pastor Andrea King',
    album: 'City Temple SDA',
    duration: 2340,
    cover: cover('ser-andrea'),
    audioUrl: A(3),
  },
]

export const trendingChoirs = [
  { id: 't1', name: 'Aeolians of Oakwood', cover: cover('t-aeolians'), songIds: ['s5', 's11'] },
  { id: 't2', name: 'PUC Church Choir', cover: cover('t-puc'), songIds: ['s11', 's3'] },
  { id: 't3', name: 'Advent Youth Choir', cover: cover('t-ayc'), songIds: ['s2', 's7'] },
  {
    id: 't4',
    name: 'COSACOW Nairobi',
    cover: cover('t-cosacow'),
    songIds: ['s15', 's16'],
  },
  {
    id: 't5',
    name: 'Maxwell SDA Choir',
    cover: cover('t-maxwell-nairobi'),
    songIds: ['s13', 's18'],
  },
  {
    id: 't6',
    name: 'Kisumu Central SDA',
    cover: cover('t-kisumu-sda'),
    songIds: ['s14', 's25'],
  },
]

export const recentlyPlayedIds = ['s4', 's1', 's8', 'ep1']

export function getSongById(id) {
  const all = [...songs, ...podcastEpisodes, ...sermonTracks]
  return all.find((x) => x.id === id)
}

export function getSongsByIds(ids) {
  return ids.map((id) => getSongById(id)).filter(Boolean)
}

export function resolvePlaylist(pl) {
  return {
    ...pl,
    songs: getSongsByIds(pl.songIds),
  }
}

export function getPlaylistById(id, userPlaylists = []) {
  const fromUser = userPlaylists.find((p) => p.id === id)
  const fromMock = playlists.find((p) => p.id === id)
  const raw = fromUser || fromMock
  return raw ? resolvePlaylist(raw) : null
}

function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i)
  }
  return Math.abs(h).toString(36)
}

let albumsCache = null
export function getAllAlbums() {
  if (albumsCache) return albumsCache
  const map = new Map()
  for (const s of songs) {
    const key = `${s.album}::${s.artist}`
    if (!map.has(key)) {
      const id = `alb-${simpleHash(key)}`
      map.set(key, {
        id,
        title: s.album,
        artist: s.artist,
        cover: s.cover,
        songIds: [],
      })
    }
    map.get(key).songIds.push(s.id)
  }
  albumsCache = [...map.values()]
  return albumsCache
}

export function getAlbumById(id) {
  return getAllAlbums().find((a) => a.id === id) ?? null
}

export function getAlbumForSong(song) {
  if (!song) return null
  return getAllAlbums().find((a) => a.songIds.includes(song.id)) ?? null
}

let artistsCache = null
export function getAllArtists() {
  if (artistsCache) return artistsCache
  const map = new Map()
  const allTracks = [...songs, ...podcastEpisodes, ...sermonTracks]
  for (const s of allTracks) {
    if (!map.has(s.artist)) {
      map.set(s.artist, {
        name: s.artist,
        cover: s.cover,
        songIds: [],
      })
    }
    map.get(s.artist).songIds.push(s.id)
  }
  artistsCache = [...map.values()]
  return artistsCache
}

export function getArtistByName(name) {
  if (!name) return null
  return getAllArtists().find((a) => a.name === name) ?? null
}

/**
 * Full ranked search: songs, sermons, podcasts, artists, albums, playlists (curated + user).
 * Exact and prefix matches rank above substring matches.
 */
export function searchCatalogFull(query, userPlaylists = []) {
  const q = query.trim()
  const empty = {
    songs: [],
    sermons: [],
    podcasts: [],
    artists: [],
    albums: [],
    playlists: [],
    topResult: null,
  }
  if (!q) return empty

  const kenyaBoost = isKenyaQuery(q)
  const kenyaSet = new Set(kenyaSongIds)

  const scoreSong = (s) => {
    let sc = bestTrackScores(s, q)
    if (kenyaBoost && kenyaSet.has(s.id)) sc += 2500
    return sc
  }

  const songsRanked = songs
    .map((s) => ({ s, score: scoreSong(s) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 48)
    .map(({ s }) => s)

  const sermonsRanked = sermonTracks
    .map((t) => ({ t, score: bestTrackScores(t, q) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ t }) => t)

  const podcastsRanked = podcastEpisodes
    .map((t) => ({ t, score: bestTrackScores(t, q) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 16)
    .map(({ t }) => t)

  const allTracks = [...songs, ...podcastEpisodes, ...sermonTracks]
  const artistMap = new Map()
  for (const t of allTracks) {
    const sc = matchScore(t.artist, q)
    if (sc < 0) continue
    const prev = artistMap.get(t.artist)
    if (prev == null || sc > prev) artistMap.set(t.artist, sc)
  }
  const artists = [...artistMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => ({
      name,
      cover:
        allTracks.find((x) => x.artist === name)?.cover ??
        cover(`artist-${name}`),
    }))

  const albumsRanked = getAllAlbums()
    .map((a) => ({
      a,
      score: Math.max(matchScore(a.title, q), matchScore(a.artist, q)),
    }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ a }) => a)

  const curatedPl = playlists.map((p) => ({
    p,
    score: Math.max(matchScore(p.title, q), matchScore(p.description, q)),
  }))

  const userPl = (userPlaylists || []).map((p) => ({
    p,
    score: Math.max(
      matchScore(p.title, q),
      matchScore(p.description || '', q),
    ),
  }))

  const playlistsRanked = [...curatedPl, ...userPl]
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ p }) => p)

  let topResult = null
  const consider = (type, item, score) => {
    if (score < 0) return
    if (!topResult || score > topResult.score) {
      topResult = { type, item, score }
    }
  }

  for (const s of songs) consider('song', s, scoreSong(s))
  for (const t of sermonTracks) consider('sermon', t, bestTrackScores(t, q))
  for (const t of podcastEpisodes) consider('podcast', t, bestTrackScores(t, q))
  for (const p of playlists) {
    consider(
      'playlist',
      p,
      Math.max(matchScore(p.title, q), matchScore(p.description, q)),
    )
  }
  for (const p of userPlaylists || []) {
    consider(
      'playlist',
      p,
      Math.max(matchScore(p.title, q), matchScore(p.description || '', q)),
    )
  }
  for (const a of getAllAlbums()) {
    consider(
      'album',
      a,
      Math.max(matchScore(a.title, q), matchScore(a.artist, q)),
    )
  }
  for (const ar of artists) {
    consider('artist', ar, matchScore(ar.name, q))
  }

  return {
    songs: songsRanked,
    sermons: sermonsRanked,
    podcasts: podcastsRanked,
    artists,
    albums: albumsRanked,
    playlists: playlistsRanked,
    topResult,
  }
}

/** @deprecated Prefer searchCatalogFull — kept for callers expecting combined episodes */
export function searchCatalog(query) {
  const r = searchCatalogFull(query, [])
  return {
    songs: r.songs,
    playlists: r.playlists,
    artists: r.artists,
    albums: r.albums,
    episodes: [...r.sermons, ...r.podcasts],
  }
}
