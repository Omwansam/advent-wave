import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Link2,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useToastStore } from '../store/useToastStore'
import { useUiStore } from '../store/useUiStore'

/** @param {{ song: object, playlistContext?: { id: string } }} props */
export function SongRowMenu({ song, playlistContext }) {
  const [open, setOpen] = useState(false)
  const [submenu, setSubmenu] = useState(false)
  const wrapRef = useRef(null)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const playNext = usePlayerStore((s) => s.playNext)
  const showToast = useToastStore((s) => s.showToast)
  const userPlaylists = useLibraryStore((s) => s.userPlaylists)
  const addSongToPlaylist = useLibraryStore((s) => s.addSongToPlaylist)
  const removeSongFromPlaylist = useLibraryStore((s) => s.removeSongFromPlaylist)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const setCreatePlaylistOpen = useUiStore((s) => s.setCreatePlaylistOpen)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSubmenu(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const menuClass =
    'absolute right-0 top-full z-[70] mt-1 max-h-[min(70vh,22rem)] w-[min(100vw-2rem,16rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10 [scrollbar-width:thin]'

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setSubmenu(false)
          setOpen((v) => !v)
        }}
        className={`rounded-full p-2 text-[var(--aw-muted)] transition hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10 ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } md:opacity-100`}
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div role="menu" className={menuClass}>
          {!submenu ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={(e) => {
                  e.stopPropagation()
                  playNext(song)
                  setOpen(false)
                }}
              >
                <ListPlus className="size-4 text-[var(--aw-primary)]" />
                Play next
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={(e) => {
                  e.stopPropagation()
                  addToQueue(song)
                  setOpen(false)
                  showToast('Added to queue')
                }}
              >
                <ListMusic className="size-4 text-[var(--aw-primary)]" />
                Add to queue
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setSubmenu(true)
                }}
              >
                <span className="flex items-center gap-2">
                  <FolderPlus className="size-4 text-[var(--aw-primary)]" />
                  Add to playlist
                </span>
                <ChevronRight className="size-4 shrink-0 text-[var(--aw-muted)]" />
              </button>
              {playlistContext ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={async (e) => {
                    e.stopPropagation()
                    setOpen(false)
                    try {
                      await removeSongFromPlaylist(playlistContext.id, song.id)
                      showToast('Removed from playlist')
                    } catch {
                      showToast('Could not remove from the playlist')
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove from playlist
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={async (e) => {
                  e.stopPropagation()
                  const url = `${window.location.origin}/search?q=${encodeURIComponent(`${song.title} ${song.artist}`)}`
                  try {
                    await navigator.clipboard.writeText(url)
                    showToast('Link copied to clipboard')
                  } catch {
                    window.prompt('Copy link:', url)
                    showToast('Copy the link from the dialog')
                  }
                  setOpen(false)
                }}
              >
                <Link2 className="size-4 text-[var(--aw-primary)]" />
                Copy song link
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setSubmenu(false)
                }}
              >
                <ChevronLeft className="size-4 text-[var(--aw-muted)]" />
                Back
              </button>
              <div className="my-1 border-t border-[var(--aw-border)]" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setCreatePlaylistOpen(true)
                  setOpen(false)
                }}
              >
                <FolderPlus className="size-4 text-[var(--aw-primary)]" />
                New playlist…
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={async (e) => {
                  e.stopPropagation()
                  setOpen(false)
                  try {
                    const id = await createPlaylist(
                      `${song.title.slice(0, 48)} mix`,
                      'Quick playlist from a track',
                    )
                    await addSongToPlaylist(id, song.id)
                    showToast('Saved to new playlist')
                  } catch {
                    showToast('Could not create the playlist')
                  }
                }}
              >
                <ListPlus className="size-4 text-[var(--aw-primary)]" />
                Quick new playlist
              </button>
              <div className="my-1 border-t border-[var(--aw-border)]" />
              {userPlaylists.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--aw-muted)]">
                  No playlists yet — create one above.
                </p>
              ) : (
                userPlaylists.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                    onClick={async (e) => {
                      e.stopPropagation()
                      setOpen(false)
                      if (p.songIds.includes(song.id)) {
                        showToast('Already in that playlist')
                        return
                      }
                      try {
                        await addSongToPlaylist(p.id, song.id)
                        showToast(`Added to ${p.title}`)
                      } catch {
                        showToast('Could not add to that playlist')
                      }
                    }}
                  >
                    <span className="truncate">{p.title}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
