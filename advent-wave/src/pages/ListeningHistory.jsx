import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Trash2 } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { getSongsByIds } from '../data/mockData'
import { useLibraryStore } from '../store/useLibraryStore'

export function ListeningHistory() {
  const recentHistory = useLibraryStore((s) => s.recentHistory)
  const recentTrackIds = useLibraryStore((s) => s.recentTrackIds)
  const clearRecentHistory = useLibraryStore((s) => s.clearRecentHistory)

  const history = useMemo(() => {
    if (recentHistory?.length) return recentHistory
    if (!recentTrackIds?.length) return []
    // Fallback for older persisted state: synthesise timestamps so ordering still works.
    return recentTrackIds.map((id, index) => ({
      id,
      ts: index,
    }))
  }, [recentHistory, recentTrackIds])

  const grouped = useMemo(() => {
    if (!history.length) {
      return {
        today: [],
        yesterday: [],
        week: [],
      }
    }
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfToday.getDate() - 1)
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - 7)

    const todayEntries = []
    const yesterdayEntries = []
    const weekEntries = []

    history.forEach((entry) => {
      const d = new Date(entry.ts || 0)
      if (Number.isNaN(d.getTime())) return
      if (d >= startOfToday) {
        todayEntries.push(entry)
      } else if (d >= startOfYesterday && d < startOfToday) {
        yesterdayEntries.push(entry)
      } else if (d >= startOfWeek) {
        weekEntries.push(entry)
      }
    })

    return {
      today: getSongsByIds(todayEntries.map((e) => e.id)),
      yesterday: getSongsByIds(yesterdayEntries.map((e) => e.id)),
      week: getSongsByIds(weekEntries.map((e) => e.id)),
    }
  }, [history])

  const hasAny =
    grouped.today.length > 0 ||
    grouped.yesterday.length > 0 ||
    grouped.week.length > 0

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--aw-primary)]">
            <Clock className="size-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Recently played
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
            Listening history
          </h1>
          <p className="mt-2 max-w-xl text-[var(--aw-muted)]">
            Tracks you have started on this device — same idea as Spotify’s
            history, stored locally in the demo.
          </p>
        </div>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={() => clearRecentHistory()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--aw-border)] px-4 py-2 text-sm font-semibold text-[var(--aw-muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-200"
          >
            <Trash2 className="size-4" />
            Clear all
          </button>
        ) : null}
      </header>

      {!hasAny ? (
        <div className="rounded-2xl bg-[var(--aw-surface)] p-12 text-center shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          <p className="text-[var(--aw-muted)]">
            Nothing here yet. Play a song and it will show up automatically.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block font-medium text-[var(--aw-primary)]"
          >
            Go to Home
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.today.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
                Today
              </h2>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {grouped.today.map((song, i) => (
                  <SongRow
                    key={`${song.id}-today-${i}`}
                    song={song}
                    index={i}
                    queue={grouped.today}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {grouped.yesterday.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
                Yesterday
              </h2>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {grouped.yesterday.map((song, i) => (
                  <SongRow
                    key={`${song.id}-yesterday-${i}`}
                    song={song}
                    index={i}
                    queue={grouped.yesterday}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {grouped.week.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
                This week
              </h2>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {grouped.week.map((song, i) => (
                  <SongRow
                    key={`${song.id}-week-${i}`}
                    song={song}
                    index={i}
                    queue={grouped.week}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
