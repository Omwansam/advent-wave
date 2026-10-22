import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Track } from '@/api/models';
import { appStorage } from '@/lib/storage';

/**
 * Screen-independent UI: the track action sheet and the add-to-playlist sheet open from any
 * row on any screen, so they live once at the root and are driven from here. Recent searches
 * are this device's own, as on the web.
 */
export interface TrackSheetContext {
  track: Track;
  /** Set when the row is in one of the listener's own playlists: offers "Remove from this playlist". */
  playlistId?: string;
  /** Set when the row is in the queue: offers "Remove from queue". */
  queueIndex?: number;
}

const MAX_RECENT_SEARCHES = 12;

interface UiState {
  trackSheet: TrackSheetContext | null;
  addToPlaylist: Track[] | null;
  createPlaylistOpen: boolean;
  recentSearches: string[];
  openTrackSheet: (ctx: TrackSheetContext) => void;
  closeTrackSheet: () => void;
  openAddToPlaylist: (tracks: Track[]) => void;
  closeAddToPlaylist: () => void;
  setCreatePlaylistOpen: (open: boolean) => void;
  rememberSearch: (q: string) => void;
  forgetSearch: (q: string) => void;
  clearSearches: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      trackSheet: null,
      addToPlaylist: null,
      createPlaylistOpen: false,
      recentSearches: [],
      openTrackSheet: (ctx) => set({ trackSheet: ctx }),
      closeTrackSheet: () => set({ trackSheet: null }),
      openAddToPlaylist: (tracks) => set({ addToPlaylist: tracks, trackSheet: null }),
      closeAddToPlaylist: () => set({ addToPlaylist: null }),
      setCreatePlaylistOpen: (open) => set({ createPlaylistOpen: open }),
      rememberSearch: (q) =>
        set((s) => {
          const term = q.trim();
          if (term.length < 2) return s;
          const rest = s.recentSearches.filter((x) => x.toLowerCase() !== term.toLowerCase());
          return { recentSearches: [term, ...rest].slice(0, MAX_RECENT_SEARCHES) };
        }),
      forgetSearch: (q) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      clearSearches: () => set({ recentSearches: [] }),
    }),
    { name: 'adventwave-ui', storage: appStorage, partialize: (s) => ({ recentSearches: s.recentSearches }) },
  ),
);
