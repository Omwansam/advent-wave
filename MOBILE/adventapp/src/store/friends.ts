import { create } from 'zustand';

import * as api from '@/api';
import { asTracks, type Track } from '@/api/models';
import type { Friend } from '@/api/types';

/** The people this listener follows and what they last played (RFC 0007), owned by the server. */
interface FriendsState {
  friends: Friend[];
  tracks: Record<string, Track>;
  loaded: boolean;
  error: unknown;
  load: () => Promise<void>;
  /** Resolves to whether the caller now follows them. */
  toggleFollow: (userId: string) => Promise<boolean>;
  reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  tracks: {},
  loaded: false,
  error: null,

  load: async () => {
    try {
      const res = await api.getFriends();
      set({
        friends: (res.friends ?? []).filter((f) => f.id),
        tracks: Object.fromEntries(asTracks(res.tracks).map((t) => [t.id, t])),
        loaded: true,
        error: null,
      });
    } catch (error) {
      set({ error, loaded: true });
    }
  },

  toggleFollow: async (userId) => {
    const { following } = await api.toggleFollowUser(userId);
    await get().load();
    return Boolean(following);
  },

  reset: () => set({ friends: [], tracks: {}, loaded: false, error: null }),
}));
