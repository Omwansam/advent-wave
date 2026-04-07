import { SongRow } from '../components/SongRow'
import { podcastEpisodes } from '../data/mockData'

export function Podcasts() {
  const queue = podcastEpisodes

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Podcasts
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--aw-muted)]">
          Teaching, stories, and weekly episodes — stream like music with the same
          global player.
        </p>
      </header>

      <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        {queue.map((song, i) => (
          <SongRow key={song.id} song={song} index={i} queue={queue} />
        ))}
      </div>
    </div>
  )
}
