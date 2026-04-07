import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { discoverCategories, getAllAlbums, playlists } from '../data/mockData'

export function Browse() {
  const albums = getAllAlbums()
  const newOnAdventWave = albums.slice(0, 8)

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--aw-primary)]/15 via-[var(--aw-bg)] to-[var(--aw-gold-soft)]/50 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
            Browse
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--aw-text)] md:text-5xl">
            Explore everything AdventWave has to offer
          </h1>
          <p className="mt-4 text-[var(--aw-muted)]">
            New releases, categories, and full album collection — similar to
            Spotify&apos;s Browse hub.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg"
            >
              <Sparkles className="size-4" />
              Go to Discover
            </Link>
            <Link
              to="/library"
              className="inline-flex items-center rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold"
            >
              Your library
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--aw-text)]">
          New on AdventWave
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {newOnAdventWave.map((a) => (
            <Link
              key={a.id}
              to={`/album/${a.id}`}
              className="aw-card-lift group overflow-hidden rounded-2xl bg-[var(--aw-surface)] shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] hover:shadow-[var(--aw-shadow-hover)] dark:ring-white/10"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={a.cover}
                  alt=""
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="line-clamp-1 font-semibold text-[var(--aw-text)]">
                  {a.title}
                </p>
                <p className="mt-1 line-clamp-1 text-sm text-[var(--aw-muted)]">
                  {a.artist}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--aw-text)]">
          Moods & ministries
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discoverCategories.map((c) => (
            <Link
              key={c.id}
              to={`/discover?cat=${c.id}`}
              className={`relative overflow-hidden rounded-2xl p-6 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] transition hover:scale-[1.01] dark:ring-white/10`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`}
              />
              <img
                src={c.cover}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-25 mix-blend-overlay"
              />
              <p className="relative text-lg font-bold text-[var(--aw-text)]">
                {c.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--aw-text)]">
          Staff picks (playlists)
        </h2>
        <div className="flex flex-wrap gap-4">
          {playlists.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              to={`/playlist/${p.id}`}
              className="rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-5 py-3 text-sm font-semibold transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              {p.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-[var(--aw-text)]">
          All albums
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((a) => (
            <Link
              key={a.id}
              to={`/album/${a.id}`}
              className="flex gap-3 rounded-xl bg-[var(--aw-surface)] p-2 shadow-sm ring-1 ring-black/[0.04] transition hover:bg-[var(--aw-surface-elevated)] dark:ring-white/10"
            >
              <img
                src={a.cover}
                alt=""
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 py-1">
                <p className="line-clamp-2 text-sm font-medium text-[var(--aw-text)]">
                  {a.title}
                </p>
                <p className="line-clamp-1 text-xs text-[var(--aw-muted)]">
                  {a.artist}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
