import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: Boolean(v) }),

      /** @type {'light' | 'dark'} */
      theme: 'light',
      setTheme: (t) =>
        set({ theme: t === 'dark' ? 'dark' : 'light' }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      fullPlayerOpen: false,
      setFullPlayerOpen: (v) => set({ fullPlayerOpen: Boolean(v) }),
      toggleFullPlayer: () =>
        set((s) => ({ fullPlayerOpen: !s.fullPlayerOpen })),

      connectDeviceOpen: false,
      setConnectDeviceOpen: (v) =>
        set({ connectDeviceOpen: Boolean(v) }),

      shortcutsOpen: false,
      setShortcutsOpen: (v) => set({ shortcutsOpen: Boolean(v) }),

      privateSession: false,
      setPrivateSession: (v) => set({ privateSession: Boolean(v) }),
      togglePrivateSession: () =>
        set((s) => ({ privateSession: !s.privateSession })),

      friendActivityCollapsed: false,
      setFriendActivityCollapsed: (v) =>
        set({ friendActivityCollapsed: Boolean(v) }),
      toggleFriendActivity: () =>
        set((s) => ({ friendActivityCollapsed: !s.friendActivityCollapsed })),

      createPlaylistOpen: false,
      /** Bumps when opening modal so the form remounts with fresh fields */
      createPlaylistSeed: 0,
      setCreatePlaylistOpen: (v) =>
        set((s) => ({
          createPlaylistOpen: Boolean(v),
          createPlaylistSeed: v ? s.createPlaylistSeed + 1 : s.createPlaylistSeed,
        })),

      /** Mock: UI only until real audio engine */
      normalizeAudio: false,
      setNormalizeAudio: (v) => set({ normalizeAudio: Boolean(v) }),
      crossfadeEnabled: false,
      setCrossfadeEnabled: (v) => set({ crossfadeEnabled: Boolean(v) }),
      crossfadeSec: 6,
      setCrossfadeSec: (v) =>
        set({ crossfadeSec: Math.min(12, Math.max(0, Number(v) || 0)) }),
    }),
    {
      name: 'adventwave-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        privateSession: s.privateSession,
        friendActivityCollapsed: s.friendActivityCollapsed,
        normalizeAudio: s.normalizeAudio,
        crossfadeEnabled: s.crossfadeEnabled,
        crossfadeSec: s.crossfadeSec,
      }),
    },
  ),
)
