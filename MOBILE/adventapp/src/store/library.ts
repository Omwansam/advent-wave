import { create } from 'zustand';

import * as api from '@/api';
import { asPlaylists, type Playlist } from '@/api/models';
import type { HistoryEntry } from '@/api/types';

/**
 * The listener's library, owned by the server: the same account looks the same on the phone
 * and the laptop. Mutations apply optimistically and roll back if the server refuses, like the
 * web app's useLibraryStore.
 */
interface LibraryData {
  likedSongIds: string[];
  savedSermonIds: string[];
  userPlaylists: Playlist[];
  followedArtistNames: string[];
  followedArtistIds: string[];
  followedPlaylistIds: string[];
  recentHistory: HistoryEntry[];
  recentTrackIds: string[];
}

interface LibraryState extends LibraryData {
  loaded: boolean;
  loading: boolean;
  error: unknown;
  load: () => Promise<void>;
  reset: () => void;
  isLiked: (id: string) => boolean;
  toggleLike: (mediaItemId: string, mediaType?: string) => Promise<boolean | null>;
  toggleFollowArtist: (artistId: string, artistName?: string) => Promise<void>;
  toggleFollowPlaylist: (playlistId: string) => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, mediaItemIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, mediaItemId: string) => Promise<void>;
  updatePlaylist: (playlistId: string, updates: { title?: string; description?: string }) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  recordTrackPlay: (mediaItemId: string) => void;
  clearHistory: () => Promise<void>;
}

const EMPTY: LibraryData = {
  likedSongIds: [],
  savedSermonIds: [],
  userPlaylists: [],
  followedArtistNames: [],
  followedArtistIds: [],
  followedPlaylistIds: [],
  recentHistory: [],
  recentTrackIds: [],
};

const MAX_RECENT = 100;

function toggleMembership(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function replacePlaylist(list: Playlist[], updated: Playlist): Playlist[] {
  return list.map((p) => (p.id === updated.id ? updated : p));
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  ...EMPTY,
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const library = await api.getLibrary();
      set({
        likedSongIds: library.likedSongIds ?? [],
        savedSermonIds: library.savedSermonIds ?? [],
        userPlaylists: asPlaylists(library.userPlaylists),
        followedArtistNames: library.followedArtistNames ?? [],
        followedArtistIds: library.followedArtistIds ?? [],
        followedPlaylistIds: library.followedPlaylistIds ?? [],
        recentHistory: library.recentHistory ?? [],
        recentTrackIds: library.recentTrackIds ?? [],
        loaded: true,
        loading: false,
      });
    } catch (error) {
      set({ error, loading: false });
    }
  },

  reset: () => set({ ...EMPTY, loaded: false, loading: false, error: null }),

  isLiked: (id) => get().likedSongIds.includes(id) || get().savedSermonIds.includes(id),

  /**
   * One call for songs and sermons: the server files it by media type. `mediaType` only picks
   * which local list changes first. Resolves to whether it is now liked, or null on failure.
   */
  toggleLike: async (mediaItemId, mediaType) => {
    const key = mediaType === 'sermon' ? 'savedSermonIds' : 'likedSongIds';
    const before = get()[key];
    set({ [key]: toggleMembership(before, mediaItemId) } as Partial<LibraryData>);
    try {
      const { liked } = await api.toggleLike(mediaItemId);
      const current = get()[key];
      if (current.includes(mediaItemId) !== Boolean(liked)) {
        set({ [key]: toggleMembership(current, mediaItemId) } as Partial<LibraryData>);
      }
      return Boolean(liked);
    } catch (error) {
      set({ [key]: before, error } as Partial<LibraryState>);
      return null;
    }
  },

  toggleFollowArtist: async (artistId, artistName) => {
    const beforeIds = get().followedArtistIds;
    const beforeNames = get().followedArtistNames;
    set({
      followedArtistIds: toggleMembership(beforeIds, artistId),
      followedArtistNames: artistName ? toggleMembership(beforeNames, artistName) : beforeNames,
    });
    try {
      await api.toggleFollowArtist(artistId);
    } catch (error) {
      set({ followedArtistIds: beforeIds, followedArtistNames: beforeNames, error });
      throw error;
    }
  },

  toggleFollowPlaylist: async (playlistId) => {
    const before = get().followedPlaylistIds;
    set({ followedPlaylistIds: toggleMembership(before, playlistId) });
    try {
      await api.toggleFollowPlaylist(playlistId);
    } catch (error) {
      set({ followedPlaylistIds: before, error });
      throw error;
    }
  },

  createPlaylist: async (title, description = '') => {
    const [playlist] = asPlaylists([await api.createPlaylist({ title: title.trim() || 'New playlist', description })]);
    set((s) => ({ userPlaylists: [...s.userPlaylists, playlist] }));
    return playlist;
  },

  addToPlaylist: async (playlistId, mediaItemIds) => {
    const [updated] = asPlaylists([await api.addPlaylistItems(playlistId, mediaItemIds)]);
    set((s) => ({ userPlaylists: replacePlaylist(s.userPlaylists, updated) }));
  },

  removeFromPlaylist: async (playlistId, mediaItemId) => {
    const [updated] = asPlaylists([await api.removePlaylistItem(playlistId, mediaItemId)]);
    set((s) => ({ userPlaylists: replacePlaylist(s.userPlaylists, updated) }));
  },

  updatePlaylist: async (playlistId, updates) => {
    const [updated] = asPlaylists([await api.updatePlaylist(playlistId, updates)]);
    set((s) => ({ userPlaylists: replacePlaylist(s.userPlaylists, updated) }));
  },

  deletePlaylist: async (playlistId) => {
    await api.deletePlaylist(playlistId);
    set((s) => ({ userPlaylists: s.userPlaylists.filter((p) => p.id !== playlistId) }));
  },

  /**
   * Local echo of a play so "Recently played" moves at once. The durable record is written by
   * the server from the playback event; the next load replaces this with its copy.
   */
  recordTrackPlay: (mediaItemId) =>
    set((s) => {
      const rest = s.recentHistory.filter((entry) => entry.id !== mediaItemId);
      const recentHistory = [{ id: mediaItemId, ts: Date.now() }, ...rest].slice(0, MAX_RECENT);
      return { recentHistory, recentTrackIds: recentHistory.map((e) => e.id ?? '') };
    }),

  clearHistory: async () => {
    const before = { recentHistory: get().recentHistory, recentTrackIds: get().recentTrackIds };
    set({ recentHistory: [], recentTrackIds: [] });
    try {
      await api.clearHistory();
    } catch (error) {
      set({ ...before, error });
      throw error;
    }
  },
}));
