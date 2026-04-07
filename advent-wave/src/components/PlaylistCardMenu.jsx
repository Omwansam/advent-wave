import { useEffect, useRef, useState } from 'react'
import { Link2, ListMusic, MoreHorizontal } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useToastStore } from '../store/useToastStore'

export function PlaylistCardMenu({ playlistId, songs }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const enqueueSongs = usePlayerStore((s) => s.enqueueSongs)
  const showToast = useToastStore((s) => s.showToast)
  const canQueue = Boolean(songs?.length)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="absolute right-2 top-2 z-20"
      onClick={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/55"
        aria-label="Playlist options"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canQueue}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              enqueueSongs(songs)
              showToast('Playlist added to queue')
              setOpen(false)
            }}
          >
            <ListMusic className="size-4 text-[var(--aw-primary)]" />
            Add to queue
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              const url = `${window.location.origin}/playlist/${playlistId}`
              try {
                await navigator.clipboard.writeText(url)
                showToast('Playlist link copied')
              } catch {
                window.prompt('Copy link:', url)
              }
              setOpen(false)
            }}
          >
            <Link2 className="size-4 text-[var(--aw-primary)]" />
            Copy link
          </button>
        </div>
      ) : null}
    </div>
  )
}
