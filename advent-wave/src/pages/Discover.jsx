import { useMemo } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { SongRow } from '../components/SongRow'
import { songs, discoverCategories, kenyaSongIds } from '../data/mockData'

export function Discover() {
  const [params] = useSearchParams()
  const cat = params.get('cat') || 'all'
  const { search: navSearch = '' } = useOutletContext() || {}

  const filtered = useMemo(() => {
    let list = songs
    if (cat !== 'all' && cat) {
      const map = {
        worship: ['s1', 's3', 's6', 's11'],
        youth: ['s7', 's12', 's2'],
        instrumental: ['s9', 's4', 's8'],
        choirs: ['s5', 's11', 's2'],
        churches: ['s3', 's6', 's10'],
        kenya: kenyaSongIds,
      }
      const ids = map[cat]
      if (ids) list = songs.filter((s) => ids.includes(s.id))
    }
    const q = navSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q),
    )
  }, [cat, navSearch])

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Discover
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Browse by mood and ministry. Tap a category, then explore tracks below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/discover"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              cat === 'all'
                ? 'bg-[var(--aw-primary)] text-white'
                : 'bg-[var(--aw-surface)] text-[var(--aw-muted)] ring-1 ring-[var(--aw-border)] hover:text-[var(--aw-text)]'
            }`}
          >
            All
          </Link>
          {discoverCategories.map((c) => (
            <Link
              key={c.id}
              to={`/discover?cat=${c.id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                cat === c.id
                  ? 'bg-[var(--aw-primary)] text-white'
                  : 'bg-[var(--aw-surface)] text-[var(--aw-muted)] ring-1 ring-[var(--aw-border)] hover:text-[var(--aw-text)]'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {discoverCategories.map((c) => {
          const active = cat === c.id
          return (
            <Link
              key={c.id}
              to={`/discover?cat=${c.id}`}
              className={`aw-card-lift group relative overflow-hidden rounded-2xl p-6 shadow-[var(--aw-shadow-card)] ring-1 hover:shadow-[var(--aw-shadow-hover)] ${
                active
                  ? 'ring-2 ring-[var(--aw-primary)]'
                  : 'ring-black/[0.04] dark:ring-white/10'
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`}
              />
              <img
                src={c.cover}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-30 mix-blend-overlay"
              />
              <div className="relative">
                <p className="text-lg font-bold text-[var(--aw-text)]">
                  {c.label}
                </p>
                <p className="mt-1 text-sm text-[var(--aw-muted)]">
                  Open collection
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)]">
          {cat === 'all' ? 'All tracks' : 'Tracks in this vibe'}
        </h2>
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {filtered.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={filtered}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
