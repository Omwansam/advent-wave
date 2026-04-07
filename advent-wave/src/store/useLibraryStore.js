import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_RECENT = 100

export const useLibraryStore = create(
  persist(
    (set) => ({
      likedSongIds: [],
      savedSermonIds: [],
      userPlaylists: [],
      /** @type {string[]} */
      followedArtistNames: [],
      /** @type {string[]} playlist ids the user follows */
      followedPlaylistIds: [],
      /** @type {{ id: string, ts: number }[]} newest-first */
      recentHistory: [],
      /** @type {string[]} newest-first; kept for backwards compatibility */
      recentTrackIds: [],

      recordTrackPlay: (songId) =>
        set((s) => {
          if (!songId) return s
          const prevHistory = Array.isArray(s.recentHistory)
            ? s.recentHistory
            : []
          const rest = prevHistory.filter((entry) => entry.id !== songId)
          const history = [
            { id: songId, ts: Date.now() },
            ...rest,
          ].slice(0, MAX_RECENT)
          return {
            recentHistory: history,
            recentTrackIds: history.map((entry) => entry.id),
          }
        }),

      clearRecentHistory: () =>
        set({
          recentHistory: [],
          recentTrackIds: [],
        }),

      /** Toggles membership in Liked Songs (no duplicates; persisted). */
      toggleLike: (songId) =>
        set((s) => {
          if (songId == null || songId === '') return s
          const has = s.likedSongIds.includes(songId)
          return {
            likedSongIds: has
              ? s.likedSongIds.filter((id) => id !== songId)
              : [...s.likedSongIds, songId],
          }
        }),

      /**
       * Playlist page: if every id is liked, remove all from Liked Songs;
       * otherwise add any missing ids (deduped).
       */
      toggleLikePlaylistTracks: (songIds) =>
        set((s) => {
          const ids = [...new Set((songIds || []).filter(Boolean))]
          if (!ids.length) return s
          const allLiked = ids.every((id) => s.likedSongIds.includes(id))
          if (allLiked) {
            const remove = new Set(ids)
            return {
              likedSongIds: s.likedSongIds.filter((id) => !remove.has(id)),
            }
          }
          const merged = new Set(s.likedSongIds)
          ids.forEach((id) => merged.add(id))
          return { likedSongIds: [...merged] }
        }),

      toggleFollowArtist: (artistName) =>
        set((s) => {
          const name = artistName?.trim()
          if (!name) return s
          const has = s.followedArtistNames.includes(name)
          return {
            followedArtistNames: has
              ? s.followedArtistNames.filter((n) => n !== name)
              : [...s.followedArtistNames, name],
          }
        }),

      toggleFollowPlaylist: (playlistId) =>
        set((s) => {
          const id = playlistId?.trim()
          if (!id) return s
          const has = s.followedPlaylistIds.includes(id)
          return {
            followedPlaylistIds: has
              ? s.followedPlaylistIds.filter((p) => p !== id)
              : [...s.followedPlaylistIds, id],
          }
        }),

      toggleSavedSermon: (id) =>
        set((s) => ({
          savedSermonIds: s.savedSermonIds.includes(id)
            ? s.savedSermonIds.filter((x) => x !== id)
            : [...s.savedSermonIds, id],
        })),

      createPlaylist: (title, description = '') => {
        const id = `u-${crypto.randomUUID()}`
        set((s) => ({
          userPlaylists: [
            ...s.userPlaylists,
            {
              id,
              title: title.trim() || 'New playlist',
              description,
              cover: `https://picsum.photos/seed/${encodeURIComponent(id)}/400/400`,
              songIds: [],
            },
          ],
        }))
        return id
      },

      addSongToPlaylist: (playlistId, songId) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === playlistId && !p.songIds.includes(songId)
              ? { ...p, songIds: [...p.songIds, songId] }
              : p,
          ),
        })),

      removeSongFromPlaylist: (playlistId, songId) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === playlistId
              ? { ...p, songIds: p.songIds.filter((id) => id !== songId) }
              : p,
          ),
        })),

      updateUserPlaylist: (playlistId, updates) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === playlistId ? { ...p, ...updates } : p,
          ),
        })),

      deleteUserPlaylist: (playlistId) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.filter((p) => p.id !== playlistId),
        })),
    }),
    { name: 'adventwave-library' },
  ),
)
