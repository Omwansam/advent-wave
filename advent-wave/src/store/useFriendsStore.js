import { create } from 'zustand'
import * as api from '../api'

/**
 * The people this listener follows and what they last played (RFC 0007), owned by the server.
 * One copy for the activity panel, the Friends page and profiles, so following someone on a
 * profile shows up in the panel without a reload.
 */
export const useFriendsStore = create((set, get) => ({
  /** @type {{ id: string, displayName: string, activity?: { mediaItemId: string, playing: boolean, atEpochMs: number } }[]} */
  friends: [],
  /** Tracks by id, for the items in `friends[].activity`. */
  tracks: {},
  loaded: false,
  /** @type {Error | null} */
  error: null,

  /** Replaces local state with the server's copy. Safe to call repeatedly, as the panel's poll does. */
  load: async () => {
    try {
      const { friends, tracks } = await api.getFriends()
      set({
        friends,
        tracks: Object.fromEntries(tracks.map((t) => [t.id, t])),
        loaded: true,
        error: null,
      })
    } catch (error) {
      set({ error, loaded: true })
    }
  },

  isFollowing: (userId) => get().friends.some((f) => f.id === userId),

  /**
   * Follows or unfollows, then re-reads the list: the server decides what activity a new friend
   * shows. Resolves to whether the caller now follows them.
   */
  toggleFollow: async (userId) => {
    const { following } = await api.toggleFollowUser(userId)
    await get().load()
    return following
  },

  /** Called on logout — the next account must not see the previous one's friends. */
  reset: () => set({ friends: [], tracks: {}, loaded: false, error: null }),
}))
