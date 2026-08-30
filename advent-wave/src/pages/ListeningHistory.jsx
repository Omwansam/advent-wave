import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Trash2 } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { PageError, PageLoading } from '../components/PageState'
import { getHistory } from '../api'
import { useApi } from '../hooks/useApi'
import { useLibraryStore } from '../store/useLibraryStore'

/** Buckets one day's worth of entries, newest first, into today / yesterday / this week. */
function groupByDay(entries, tracksById) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - 7)

  const buckets = { today: [], yesterday: [], week: [] }

  entries.forEach((entry) => {
    const track = tracksById.get(entry.id)
    if (!track) return
    const at = new Date(entry.ts || 0)
    if (Number.isNaN(at.getTime())) return
    if (at >= startOfToday) buckets.today.push(track)
    else if (at >= startOfYesterday) buckets.yesterday.push(track)
    else if (at >= startOfWeek) buckets.week.push(track)
  })

  return buckets
}

export function ListeningHistory() {
  const clearRecentHistory = useLibraryStore((s) => s.clearRecentHistory)

  // Server-side history: written only for plays that count (>=30s or >=50%) and never for
  // private sessions, so this page shows what the server actually recorded — not local echoes.
  const { data, error, loading, refetch, setData } = useApi(
    (signal) => getHistory({ signal }),
    [],
  )

  const grouped = useMemo(() => {
    const entries = data?.entries ?? []
    const tracksById = new Map((data?.tracks ?? []).map((t) => [t.id, t]))
    return groupByDay(entries, tracksById)
  }, [data])

  const onClear = async () => {
    setData({ entries: [], tracks: [] })
    await clearRecentHistory()
  }

  if (loading) return <PageLoading sections={2} />
  if (error) return <PageError error={error} onRetry={refetch} what="your history" />

  const hasAny =
    grouped.today.length > 0 || grouped.yesterday.length > 0 || grouped.week.length > 0
  const sections = [
    ['Today', grouped.today],
    ['Yesterday', grouped.yesterday],
    ['This week', grouped.week],
  ]

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
            Plays recorded on your account, on any device. Private sessions are
            never recorded.
          </p>
        </div>
        {hasAny ? (
          <button
            type="button"
            onClick={onClear}
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
            Nothing here yet. Play a track for 30 seconds and it will show up.
          </p>
          <Link to="/" className="mt-4 inline-block font-medium text-[var(--aw-primary)]">
            Go to Home
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(([label, tracks]) =>
            tracks.length ? (
              <section key={label}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
                  {label}
                </h2>
                <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                  {tracks.map((song, i) => (
                    <SongRow
                      key={`${song.id}-${label}-${i}`}
                      song={song}
                      index={i}
                      queue={tracks}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
