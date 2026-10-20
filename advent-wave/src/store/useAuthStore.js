import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSession } from '../api'
import { setAuthToken } from '../api/token'
import { useLibraryStore } from './useLibraryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSleepTimerStore } from './useSleepTimerStore'
import { useUiStore } from './useUiStore'

/**
 * Owns the bearer token. `setAuthToken` mirrors it into the api module, which is what every
 * request reads — the store is the source of truth, the api module is just where the client
 * can reach it without importing this file.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      /** @type {{ id: string, name: string, email: string, region: string | null } | null} */
      user: null,
      /** @type {string | null} */
      token: null,

      /**
       * Exchanges the email for a real token from the gateway. Throws ApiError on failure so
       * the login form can show what actually went wrong instead of a generic message.
       */
      login: async (email, name) => {
        const session = await createSession(email.trim(), name?.trim() || undefined)
        setAuthToken(session.token)
        set({ token: session.token, user: session.user })
        return session.user
      },

      logout: () => {
        setAuthToken(null)
        set({ user: null, token: null })
        // The library and settings are another account's data the moment the token changes.
        useLibraryStore.getState().reset()
        usePlayerStore.getState().resetForLogout()
        useUiStore.getState().resetSettings()
        // A timer set by one listener must not pause the next one's session.
        useSleepTimerStore.getState().cancel()
      },
    }),
    {
      name: 'adventwave-auth',
      // v0 persisted a { name, email } object and no token — there was no server to get one
      // from. Those sessions cannot authenticate, so they start over rather than half-work.
      version: 1,
      migrate: () => ({ user: null, token: null }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token)
      },
    },
  ),
)
