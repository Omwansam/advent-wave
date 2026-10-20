import { SongRow } from '../components/SongRow'
import { FilterChips } from '../components/FilterChips'
import { ListeningProgress } from '../components/ListeningProgress'
import { PageError, PageLoading } from '../components/PageState'
import { getBrowse } from '../api'
import { useApi } from '../hooks/useApi'
import { PROGRESS_FILTERS, useProgressFilter } from '../hooks/useProgressFilter'

const NONE = []

const EMPTY_MESSAGE = {
  'in-progress': 'Nothing in progress. An episode you stop partway through waits for you here.',
  unplayed: 'You have started every episode here.',
}

export function Podcasts() {
  const { data, error, loading, refetch } = useApi((signal) => getBrowse({ signal }), [])
  const { filter, setFilter, visible, progress } = useProgressFilter(data?.podcasts ?? NONE)

  if (loading) return <PageLoading sections={1} />
  if (error) return <PageError error={error} onRetry={refetch} what="podcasts" />

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Podcasts
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Teaching, stories, and weekly episodes — stream like music with the same
          global player.
        </p>
      </header>

      <div className="mb-4">
        <FilterChips options={PROGRESS_FILTERS} value={filter} onChange={setFilter} label="Filter episodes" />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-[var(--aw-surface)] p-6 text-sm text-[var(--aw-muted)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {EMPTY_MESSAGE[filter] ?? 'No episodes yet.'}
        </p>
      ) : (
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {visible.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={visible}
              endSlot={<ListeningProgress track={song} progress={progress[song.id]} />}
            />
          ))}
        </div>
      )}
    </div>
  )
}
