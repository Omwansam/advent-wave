import { Bookmark } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { sermonTracks } from '../data/mockData'
import { useLibraryStore } from '../store/useLibraryStore'

export function Sermons() {
  const savedSermonIds = useLibraryStore((s) => s.savedSermonIds)
  const toggleSavedSermon = useLibraryStore((s) => s.toggleSavedSermon)
  const queue = sermonTracks

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Sermons
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Save messages for later — your library syncs locally until accounts ship.
        </p>
      </header>

      <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        {queue.map((song, i) => (
          <SongRow
            key={song.id}
            song={song}
            index={i}
            queue={queue}
            endSlot={
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
            }
          />
        ))}
      </div>
    </div>
  )
}
