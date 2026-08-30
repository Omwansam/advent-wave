import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useLibraryStore } from '../store/useLibraryStore'
import { useUiStore } from '../store/useUiStore'

function CreatePlaylistForm({ onClose }) {
  const navigate = useNavigate()
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const inputRef = useRef(null)
  const [title, setTitle] = useState('My new playlist')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const id = await createPlaylist(
        title.trim() || 'New playlist',
        description.trim(),
      )
      onClose()
      navigate(`/playlist/${id}`)
    } catch (err) {
      setError(err.message || 'Could not create the playlist.')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2
          id="cp-title"
          className="text-lg font-bold text-[var(--aw-text)]"
        >
          Create playlist
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--aw-muted)]">
        Like Spotify — name it, then add songs from menus or search.
      </p>
      <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
        Name
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 py-3 text-[var(--aw-text)] outline-none ring-[var(--aw-primary)] focus:ring-2"
          placeholder="Playlist name"
        />
      </label>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 py-3 text-sm text-[var(--aw-text)] outline-none ring-[var(--aw-primary)] focus:ring-2"
          placeholder="What is this list for?"
        />
      </label>
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--aw-muted)] hover:bg-black/5 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-[var(--aw-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--aw-primary)]/25 transition hover:bg-[var(--aw-primary-hover)] disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </>
  )
}

export function CreatePlaylistModal() {
  const open = useUiStore((s) => s.createPlaylistOpen)
  const setOpen = useUiStore((s) => s.setCreatePlaylistOpen)
  const seed = useUiStore((s) => s.createPlaylistSeed)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.code === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-sm md:left-[var(--aw-sidebar-w)]"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-labelledby="cp-title"
        className="fixed left-1/2 top-1/2 z-[86] w-[min(100vw-2rem,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--aw-surface)] p-6 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <CreatePlaylistForm key={seed} onClose={() => setOpen(false)} />
      </div>
    </>
  )
}
