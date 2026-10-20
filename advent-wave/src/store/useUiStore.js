import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getSettings, updateSettings } from '../api'

/**
 * UI state. The fields below the divider are owned by the server (user_settings), because
 * they have to hold across devices and because the server acts on some of them: private
 * session decides whether a play reaches listening history, and audio quality picks the
 * bitrate profile in the stream manifest. A toggle that only reached localStorage would
 * silently not apply.
 *
 * Local state still changes first so the UI never waits on a round trip; the write is
 * debounced and pushed after.
 */

/** Mirrors UserSettingsDto. Anything not listed here never leaves the browser. */
const SERVER_FIELDS = [
  'theme',
  'privateSession',
  'normalizeAudio',
  'crossfadeEnabled',
  'crossfadeSec',
  'sidebarCollapsed',
  'friendActivityCollapsed',
  'audioQuality',
  'autoplay',
  'shareActivity',
]

const PUSH_DELAY_MS = 400
let pushTimer

function serverSettings(state) {
  return Object.fromEntries(SERVER_FIELDS.map((key) => [key, state[key]]))
}

/**
 * Coalesces bursts of toggles into one PUT. Never runs before the server's copy has been
 * loaded — otherwise signing in would push the previous account's settings over this one's.
 */
function schedulePush(get) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = undefined
    const state = get()
    if (!state.settingsHydrated) return
    updateSettings(serverSettings(state)).catch(() => {
      // A failed settings write is not worth interrupting the user for; the next change
      // retries, and a reload re-reads the server's copy.
    })
  }, PUSH_DELAY_MS)
}

export const useUiStore = create(
  persist(
    (set, get) => {
      /** Applies a local change, then queues the server write. */
      const setSynced = (patch) => {
        set(patch)
        schedulePush(get)
      }

      return {
        settingsHydrated: false,

        /** Replaces the server-owned fields with the account's stored copy. */
        hydrateSettings: async () => {
          try {
            const settings = await getSettings()
            set({ ...settings, settingsHydrated: true })
          } catch {
            // Offline or unauthenticated: keep what is on screen and try again next mount.
          }
        },

        /** On logout, so the next account's hydrate is not raced by this one's values. */
        resetSettings: () => {
          if (pushTimer) clearTimeout(pushTimer)
          pushTimer = undefined
          set({ settingsHydrated: false })
        },

        // ---------------------------------------------------------- server-owned
        sidebarCollapsed: false,
        toggleSidebar: () =>
          setSynced({ sidebarCollapsed: !get().sidebarCollapsed }),
        setSidebarCollapsed: (v) => setSynced({ sidebarCollapsed: Boolean(v) }),

        /** @type {'light' | 'dark'} */
        theme: 'light',
        setTheme: (t) => setSynced({ theme: t === 'dark' ? 'dark' : 'light' }),
        toggleTheme: () =>
          setSynced({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

        privateSession: false,
        setPrivateSession: (v) => setSynced({ privateSession: Boolean(v) }),
        togglePrivateSession: () =>
          setSynced({ privateSession: !get().privateSession }),

        friendActivityCollapsed: false,
        setFriendActivityCollapsed: (v) =>
          setSynced({ friendActivityCollapsed: Boolean(v) }),
        toggleFriendActivity: () =>
          setSynced({ friendActivityCollapsed: !get().friendActivityCollapsed }),

        /** The server measures loudness once per item and returns the gain to apply. */
        normalizeAudio: false,
        setNormalizeAudio: (v) => setSynced({ normalizeAudio: Boolean(v) }),

        /** Client-side: MusicPlayer's two elements and useCrossfade. Songs only, never sermons. */
        crossfadeEnabled: false,
        setCrossfadeEnabled: (v) => setSynced({ crossfadeEnabled: Boolean(v) }),
        crossfadeSec: 6,
        setCrossfadeSec: (v) =>
          setSynced({ crossfadeSec: Math.min(12, Math.max(0, Number(v) || 0)) }),

        /** Picks the bitrate profile the stream manifest selects. */
        audioQuality: 'normal',
        setAudioQuality: (v) => setSynced({ audioQuality: v }),

        /** When the queue ends, keep playing something similar (RFC 0004). On by default. */
        autoplay: true,
        setAutoplay: (v) => setSynced({ autoplay: Boolean(v) }),

        /** The people who follow you see what you play (RFC 0007). Private session still hides it. */
        shareActivity: true,
        setShareActivity: (v) => setSynced({ shareActivity: Boolean(v) }),

        // ---------------------------------------------------------- local only
        fullPlayerOpen: false,
        setFullPlayerOpen: (v) => set({ fullPlayerOpen: Boolean(v) }),
        toggleFullPlayer: () =>
          set((s) => ({ fullPlayerOpen: !s.fullPlayerOpen })),

        shortcutsOpen: false,
        setShortcutsOpen: (v) => set({ shortcutsOpen: Boolean(v) }),

        createPlaylistOpen: false,
        /** Bumps when opening modal so the form remounts with fresh fields */
        createPlaylistSeed: 0,
        setCreatePlaylistOpen: (v) =>
          set((s) => ({
            createPlaylistOpen: Boolean(v),
            createPlaylistSeed: v ? s.createPlaylistSeed + 1 : s.createPlaylistSeed,
          })),
      }
    },
    {
      name: 'adventwave-ui',
      // Persisted only so the first paint after a reload is not a flash of defaults; the
      // server's copy replaces these as soon as hydrateSettings resolves.
      partialize: (s) => Object.fromEntries(SERVER_FIELDS.map((k) => [k, s[k]])),
    },
  ),
)
