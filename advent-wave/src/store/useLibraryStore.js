import { create } from 'zustand'
import * as api from '../api'

/**
 * The user's library, owned by the server.
 *
 * Nothing here is persisted to localStorage any more: the same account is expected to look
 * the same on another device, which only works if Postgres is the source of truth. Mutations
 * apply optimistically and roll back if the server rejects them, so the UI stays responsive
 * without inventing state the server never accepted.
 */

const EMPTY = {
  likedSongIds: [],
  savedSermonIds: [],
  userPlaylists: [],
  followedArtistNames: [],
  followedArtistIds: [],
  followedPlaylistIds: [],
  recentHistory: [],
  recentTrackIds: [],
}

const MAX_RECENT = 100

function toggleMembership(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export const useLibraryStore = create((set, get) => ({
  ...EMPTY,
  loaded: false,
  loading: false,
  /** @type {Error | null} */
  error: null,

  /** Replaces local state with the server's copy. Safe to call repeatedly. */
  load: async () => {
    set({ loading: true, error: null })
    try {
      const library = await api.getLibrary()
      set({ ...EMPTY, ...library, loaded: true, loading: false })
    } catch (error) {
      set({ error, loading: false })
    }
  },

  /** Called on logout — the next account must not see the previous one's library. */
  reset: () => set({ ...EMPTY, loaded: false, loading: false, error: null }),

  /**
   * One call for songs and sermons: the server routes to liked_songs or saved_sermons by the
   * item's media_type. `mediaType` is only used to pick which local list to update optimistically.
   */
  toggleLike: async (mediaItemId, mediaType) => {
    if (!mediaItemId) return
    const key = mediaType === 'sermon' ? 'savedSermonIds' : 'likedSongIds'
    const before = get()[key]
    set({ [key]: toggleMembership(before, mediaItemId) })
    try {
      const { liked } = await api.toggleLike(mediaItemId)
      // The server is authoritative on which list it landed in; reconcile if we guessed wrong.
      const current = get()[key]
      const has = current.includes(mediaItemId)
      if (has !== liked) set({ [key]: toggleMembership(current, mediaItemId) })
    } catch (error) {
      set({ [key]: before, error })
    }
  },

  /** Kept for the sermon pages, which know the media type without inspecting the item. */
  toggleSavedSermon: (mediaItemId) => get().toggleLike(mediaItemId, 'sermon'),

  /**
   * Playlist page bulk action. The server toggle is an unconditional flip, so the set of ids
   * to send is computed here: unlike everything only when everything is already liked.
   */
  toggleLikePlaylistTracks: async (mediaItemIds) => {
    const ids = [...new Set((mediaItemIds || []).filter(Boolean))]
    if (!ids.length) return
    const liked = get().likedSongIds
    const allLiked = ids.every((id) => liked.includes(id))
    const toFlip = allLiked ? ids : ids.filter((id) => !liked.includes(id))
    await Promise.all(toFlip.map((id) => get().toggleLike(id)))
  },

  toggleFollowArtist: async (artistId, artistName) => {
    if (!artistId) return
    const beforeIds = get().followedArtistIds
    const beforeNames = get().followedArtistNames
    set({
      followedArtistIds: toggleMembership(beforeIds, artistId),
      followedArtistNames: artistName
        ? toggleMembership(beforeNames, artistName)
        : beforeNames,
    })
    try {
      await api.toggleFollowArtist(artistId)
    } catch (error) {
      set({ followedArtistIds: beforeIds, followedArtistNames: beforeNames, error })
    }
  },

  toggleFollowPlaylist: async (playlistId) => {
    if (!playlistId) return
    const before = get().followedPlaylistIds
    set({ followedPlaylistIds: toggleMembership(before, playlistId) })
    try {
      await api.toggleFollowPlaylist(playlistId)
    } catch (error) {
      set({ followedPlaylistIds: before, error })
    }
  },

  /** @returns {Promise<string | null>} the new playlist's id, for navigating to it */
  createPlaylist: async (title, description = '') => {
    const playlist = await api.createPlaylist({
      title: title.trim() || 'New playlist',
      description,
    })
    set((s) => ({ userPlaylists: [...s.userPlaylists, playlist] }))
    return playlist.id
  },

  addSongToPlaylist: async (playlistId, mediaItemId) => {
    const updated = await api.addPlaylistItems(playlistId, [mediaItemId])
    set((s) => ({
      userPlaylists: s.userPlaylists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  removeSongFromPlaylist: async (playlistId, mediaItemId) => {
    const updated = await api.removePlaylistItem(playlistId, mediaItemId)
    set((s) => ({
      userPlaylists: s.userPlaylists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  updateUserPlaylist: async (playlistId, updates) => {
    const updated = await api.updatePlaylist(playlistId, updates)
    set((s) => ({
      userPlaylists: s.userPlaylists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  deleteUserPlaylist: async (playlistId) => {
    await api.deletePlaylist(playlistId)
    set((s) => ({
      userPlaylists: s.userPlaylists.filter((p) => p.id !== playlistId),
    }))
  },

  /**
   * Local echo of a play so the "Recently played" rail updates immediately. The durable
   * record is written by the server from the playback event the player sends; this is not
   * a second source of truth, and a reload replaces it with the server's history.
   */
  recordTrackPlay: (mediaItemId) =>
    set((s) => {
      if (!mediaItemId) return s
      const rest = s.recentHistory.filter((entry) => entry.id !== mediaItemId)
      const recentHistory = [{ id: mediaItemId, ts: Date.now() }, ...rest].slice(0, MAX_RECENT)
      return { recentHistory, recentTrackIds: recentHistory.map((e) => e.id) }
    }),

  clearRecentHistory: async () => {
    const before = { recentHistory: get().recentHistory, recentTrackIds: get().recentTrackIds }
    set({ recentHistory: [], recentTrackIds: [] })
    try {
      await api.clearHistory()
    } catch (error) {
      set({ ...before, error })
    }
  },
}))
