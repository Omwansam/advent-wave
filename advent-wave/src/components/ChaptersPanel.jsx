import { indexAt, useChapters } from '../hooks/useMediaText'
import { formatDuration } from '../utils/format'

/**
 * A sermon's or episode's chapters in the full player (RFC 0004): scripture reading, sermon,
 * appeal. The one playing is marked; pressing one goes there. Nothing at all when there are none —
 * the reference client shows its Chapters entry only when an episode has some.
 *
 * @param {{ track: object, currentTime: number, onSeek: (seconds: number) => void }} props
 */
export function ChaptersPanel({ track, currentTime, onSeek }) {
  const chapters = useChapters(track).data?.chapters ?? []
  if (!chapters.length) return null
  const active = indexAt(chapters, currentTime * 1000)

  return (
    <section
      aria-label="Chapters"
      className="mt-10 rounded-2xl bg-[var(--aw-surface-elevated)] p-4 ring-1 ring-black/[0.04] dark:ring-white/10"
    >
      <h3 className="px-2 pb-2 text-sm font-semibold text-[var(--aw-text)]">
        Chapters <span className="font-normal text-[var(--aw-muted)]">· {chapters.length}</span>
      </h3>
      <ol className="space-y-0.5">
        {chapters.map((c, i) => (
          <li key={c.startMs}>
            <button
              type="button"
              onClick={() => onSeek(c.startMs / 1000)}
              aria-current={i === active ? 'true' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition ${
                i === active
                  ? 'bg-[var(--aw-primary)]/12 font-semibold text-[var(--aw-primary)]'
                  : 'text-[var(--aw-text)] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <span className="w-12 shrink-0 tabular-nums text-[var(--aw-muted)]">{formatDuration(c.startMs / 1000)}</span>
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
