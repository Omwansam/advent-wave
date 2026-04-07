import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Play,
  Shuffle,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { LikeButton } from '../components/LikeButton'
import { getPlaylistById } from '../data/mockData'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useToastStore } from '../store/useToastStore'

function PlaylistHeaderMenu({
  playlistId,
  songs,
  isUser,
  onEdit,
  onDelete,
}) {
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-muted)] transition hover:border-[var(--aw-primary)]/30 hover:text-[var(--aw-text)]"
        aria-label="Playlist options"
        aria-expanded={open}
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10 md:left-auto md:right-0"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canQueue}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)] disabled:opacity-40"
            onClick={() => {
              enqueueSongs(songs)
              showToast('Playlist added to queue')
              setOpen(false)
            }}
          >
            Add to queue
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
            onClick={async () => {
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
            Copy link
          </button>
          {isUser ? (
            <>
              <div className="my-1 border-t border-[var(--aw-border)]" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
                onClick={() => {
                  onEdit()
                  setOpen(false)
                }}
              >
                <Pencil className="size-4 text-[var(--aw-primary)]" />
                Edit details
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => {
                  onDelete()
                  setOpen(false)
                }}
              >
                <Trash2 className="size-4" />
                Delete playlist
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function EditPlaylistModal({ title, description, onSave, onClose }) {
  const [t, setT] = useState(title)
  const [d, setD] = useState(description)

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-sm md:left-[var(--aw-sidebar-w)]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="edit-pl-title"
        className="fixed left-1/2 top-1/2 z-[86] w-[min(100vw-2rem,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--aw-surface)] p-6 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="edit-pl-title"
            className="text-lg font-bold text-[var(--aw-text)]"
          >
            Edit playlist
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
        <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Name
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 py-3 text-[var(--aw-text)] outline-none ring-[var(--aw-primary)] focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Description
          <textarea
            value={d}
            onChange={(e) => setD(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 py-3 text-sm text-[var(--aw-text)] outline-none ring-[var(--aw-primary)] focus:ring-2"
          />
        </label>
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
            onClick={() => onSave({ title: t.trim(), description: d.trim() })}
            className="rounded-full bg-[var(--aw-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--aw-primary-hover)]"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

export function PlaylistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userPlaylists = useLibraryStore((s) => s.userPlaylists)
  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const toggleLikePlaylistTracks = useLibraryStore(
    (s) => s.toggleLikePlaylistTracks,
  )
  const updateUserPlaylist = useLibraryStore((s) => s.updateUserPlaylist)
  const deleteUserPlaylist = useLibraryStore((s) => s.deleteUserPlaylist)
  const followedPlaylistIds = useLibraryStore((s) => s.followedPlaylistIds)
  const toggleFollowPlaylist = useLibraryStore((s) => s.toggleFollowPlaylist)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const setShuffle = usePlayerStore((s) => s.setShuffle)
  const showToast = useToastStore((s) => s.showToast)

  const [editOpen, setEditOpen] = useState(false)
  const [editNonce, setEditNonce] = useState(0)

  const playlist = useMemo(
    () => getPlaylistById(id, userPlaylists),
    [id, userPlaylists],
  )

  const playlistTrackIds = useMemo(
    () => playlist?.songs?.map((s) => s.id) ?? [],
    [playlist],
  )
  const allPlaylistLiked = useMemo(
    () =>
      playlistTrackIds.length > 0 &&
      playlistTrackIds.every((sid) => likedSongIds.includes(sid)),
    [playlistTrackIds, likedSongIds],
  )

  const isUser = Boolean(id?.startsWith('u-'))
  const isFollowingPlaylist = Boolean(
    playlist && followedPlaylistIds.includes(playlist.id),
  )

  if (!playlist) {
    return (
      <div className="rounded-2xl bg-[var(--aw-surface)] p-12 text-center shadow-[var(--aw-shadow-card)]">
        <p className="text-[var(--aw-muted)]">Playlist not found.</p>
        <Link
          to="/library"
          className="mt-4 inline-block font-medium text-[var(--aw-primary)]"
        >
          Back to Library
        </Link>
      </div>
    )
  }

  const { songs } = playlist

  const onShufflePlay = () => {
    if (!songs.length) return
    setShuffle(true)
    const i = Math.floor(Math.random() * songs.length)
    playQueue(songs, i)
    showToast('Shuffle play')
  }

  const onDeletePlaylist = () => {
    if (
      !window.confirm(
        `Delete playlist “${playlist.title}”? This cannot be undone.`,
      )
    ) {
      return
    }
    deleteUserPlaylist(playlist.id)
    showToast('Playlist deleted')
    navigate('/library', { replace: true })
  }

  const onSaveEdit = ({ title, description }) => {
    updateUserPlaylist(playlist.id, {
      title: title || 'Untitled',
      description,
    })
    setEditOpen(false)
    showToast('Playlist updated')
  }

  return (
    <div>
      <Link
        to="/library"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--aw-muted)] transition hover:text-[var(--aw-primary)]"
      >
        <ArrowLeft className="size-4" />
        Library
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end">
        <div className="relative aspect-square w-full max-w-[280px] shrink-0 overflow-hidden rounded-3xl shadow-2xl shadow-[var(--aw-primary)]/20 ring-1 ring-black/5">
          <img
            src={playlist.cover}
            alt=""
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
            {isUser ? 'Your playlist' : 'Playlist'}
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[var(--aw-text)] md:text-5xl">
            {playlist.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--aw-muted)]">
            {playlist.description}
          </p>
          <p className="mt-2 text-sm text-[var(--aw-muted)]">
            {songs.length} tracks
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!songs.length}
              onClick={() => {
                setShuffle(false)
                playQueue(songs, 0)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--aw-primary)]/25 transition enabled:hover:bg-[var(--aw-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="size-4 fill-current" />
              Play
            </button>
            <button
              type="button"
              disabled={!songs.length}
              onClick={onShufflePlay}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold text-[var(--aw-text)] transition enabled:hover:border-[var(--aw-primary)]/40 enabled:hover:bg-[var(--aw-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shuffle className="size-4" />
              Shuffle
            </button>
            {!isUser ? (
              <button
                type="button"
                onClick={() => {
                  const willFollow = !isFollowingPlaylist
                  toggleFollowPlaylist(playlist.id)
                  showToast(
                    willFollow
                      ? `Following playlist “${playlist.title}”`
                      : `Unfollowed playlist “${playlist.title}”`,
                  )
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition ${
                  isFollowingPlaylist
                    ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10 text-[var(--aw-primary)]'
                    : 'border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)]/40'
                }`}
              >
                {isFollowingPlaylist ? (
                  <UserCheck className="size-4" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {isFollowingPlaylist ? 'Following' : 'Follow'}
              </button>
            ) : null}
            <span
              title={
                allPlaylistLiked
                  ? 'Remove all tracks from Liked Songs'
                  : 'Save all tracks to Liked Songs'
              }
            >
              <LikeButton
                liked={allPlaylistLiked}
                disabled={!songs.length}
                stopPropagation={false}
                onToggle={() => {
                  toggleLikePlaylistTracks(playlistTrackIds)
                  showToast(
                    allPlaylistLiked
                      ? 'Removed from Liked Songs'
                      : 'Saved to Liked Songs',
                  )
                }}
                size="md"
                className="inline-flex size-11 border border-[var(--aw-border)] bg-[var(--aw-surface)] hover:border-[var(--aw-primary)]/30"
              />
            </span>
            <PlaylistHeaderMenu
              playlistId={playlist.id}
              songs={songs}
              isUser={isUser}
              onEdit={() => {
                setEditNonce((n) => n + 1)
                setEditOpen(true)
              }}
              onDelete={onDeletePlaylist}
            />
          </div>
        </div>
      </div>

      {editOpen ? (
        <EditPlaylistModal
          key={editNonce}
          title={playlist.title}
          description={playlist.description ?? ''}
          onClose={() => setEditOpen(false)}
          onSave={onSaveEdit}
        />
      ) : null}

      <section className="mt-12">
        <div className="mb-2 hidden grid-cols-[minmax(0,48px)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[var(--aw-border)] px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)] md:grid">
          <span>#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="text-right">Time</span>
        </div>
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {songs.length === 0 ? (
            <p className="py-8 text-center text-[var(--aw-muted)]">
              This playlist is empty. Add tracks from the ··· menu on any song.
            </p>
          ) : (
            songs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                queue={songs}
                playlistContext={
                  isUser ? { id: playlist.id } : undefined
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
