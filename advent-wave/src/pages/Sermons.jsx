import { Bookmark } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { FilterChips } from '../components/FilterChips'
import { ListeningProgress } from '../components/ListeningProgress'
import { PageError, PageLoading } from '../components/PageState'
import { getBrowse } from '../api'
import { useApi } from '../hooks/useApi'
import { PROGRESS_FILTERS, useProgressFilter } from '../hooks/useProgressFilter'
import { useLibraryStore } from '../store/useLibraryStore'

const NONE = []

const EMPTY_MESSAGE = {
  'in-progress': 'Nothing in progress. A sermon you stop partway through waits for you here.',
  unplayed: 'You have started every sermon here.',
}

export function Sermons() {
  const savedSermonIds = useLibraryStore((s) => s.savedSermonIds)
  const toggleSavedSermon = useLibraryStore((s) => s.toggleSavedSermon)

  const { data, error, loading, refetch } = useApi((signal) => getBrowse({ signal }), [])
  const { filter, setFilter, visible, progress } = useProgressFilter(data?.sermons ?? NONE)

  if (loading) return <PageLoading sections={1} />
  if (error) return <PageError error={error} onRetry={refetch} what="sermons" />

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Sermons
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Save messages for later — your library follows your account across devices.
          A sermon you stop partway through picks up where you left it.
        </p>
      </header>

      <div className="mb-4">
        <FilterChips options={PROGRESS_FILTERS} value={filter} onChange={setFilter} label="Filter sermons" />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-[var(--aw-surface)] p-6 text-sm text-[var(--aw-muted)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {EMPTY_MESSAGE[filter] ?? 'No sermons yet.'}
        </p>
      ) : (
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {visible.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={visible}
              endSlot={
                <>
                  <ListeningProgress track={song} progress={progress[song.id]} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSavedSermon(song.id)
                    }}
                    className={`rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                      savedSermonIds.includes(song.id)
                        ? 'text-[var(--aw-gold)]'
                        : 'text-[var(--aw-muted)]'
                    }`}
                    aria-label="Save sermon"
                  >
                    <Bookmark
                      className={`size-4 ${savedSermonIds.includes(song.id) ? 'fill-current' : ''}`}
                    />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
