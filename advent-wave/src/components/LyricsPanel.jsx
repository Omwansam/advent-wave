import { useEffect, useRef } from 'react'
import { indexAt, useLyrics } from '../hooks/useMediaText'

/**
 * A song's words in the full player (RFC 0004). Synced lyrics follow the recording — the current
 * line lit, the ones sung dimmed — and a line pressed seeks there. Unsynced lyrics are the plain
 * text with a note saying so. The credit is part of the right to show them, so it is always shown.
 *
 * @param {{ track: object, currentTime: number, onSeek: (seconds: number) => void }} props
 */
export function LyricsPanel({ track, currentTime, onSeek }) {
  const { data, error, loading } = useLyrics(track)
  const scrollRef = useRef(null)
  const lineRefs = useRef([])

  const lines = data?.lines ?? []
  const synced = Boolean(data?.synced)
  const active = synced ? indexAt(lines, currentTime * 1000) : -1

  // Keep the sung line in the middle of the card. The card scrolls itself, not the page: the
  // full player behind it must not jump on every line.
  useEffect(() => {
    const box = scrollRef.current
    const line = lineRefs.current[active]
    if (!box || !line) return
    box.scrollTo({ top: line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2, behavior: 'smooth' })
  }, [active])

  return (
    <section
      aria-label="Lyrics"
      className="mt-10 rounded-2xl bg-[var(--aw-surface-elevated)] p-6 ring-1 ring-black/[0.04] dark:ring-white/10"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--aw-text)]">Lyrics</h3>
        {data && !synced ? (
          <span className="text-xs text-[var(--aw-muted)]">Not synced to this recording yet</span>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--aw-muted)]">Loading lyrics…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-[var(--aw-muted)]">Couldn&apos;t load the lyrics. Try again later.</p>
      ) : !data ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--aw-muted)]">
          No lyrics for this one yet. Sing along anyway.
        </p>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="relative mt-4 max-h-80 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
            dir="auto"
            lang={data.language || undefined}
          >
            {lines.map((line, i) => {
              if (!line.text.trim()) return <div key={i} className="h-3" aria-hidden />
              const state = !synced ? 'plain' : i === active ? 'now' : i < active ? 'past' : 'next'
              const tone = {
                plain: 'text-[var(--aw-text)]',
                now: 'text-[var(--aw-primary)] scale-[1.02]',
                past: 'text-[var(--aw-muted)]/70',
                next: 'text-[var(--aw-muted)]',
              }[state]
              return synced ? (
                <button
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el
                  }}
                  type="button"
                  onClick={() => onSeek(line.startMs / 1000)}
                  aria-current={i === active ? 'true' : undefined}
                  className={`block w-full origin-left text-left text-lg font-semibold leading-snug transition duration-200 hover:text-[var(--aw-text)] ${tone}`}
                >
                  {line.text}
                </button>
              ) : (
                <p key={i} className={`text-lg font-semibold leading-snug ${tone}`}>
                  {line.text}
                </p>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--aw-muted)]">{data.credit}</p>
        </>
      )}
    </section>
  )
}
