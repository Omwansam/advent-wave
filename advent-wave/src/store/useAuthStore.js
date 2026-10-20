import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSession, getMe, login as loginRequest, register as registerRequest } from '../api'
import { setAuthToken } from '../api/token'
import { useFriendsStore } from './useFriendsStore'
import { useLibraryStore } from './useLibraryStore'
import { usePlayerStore } from './usePlayerStore'
import { useSleepTimerStore } from './useSleepTimerStore'
import { useUiStore } from './useUiStore'

/**
 * Owns the bearer token. `setAuthToken` mirrors it into the api module, which is what every
 * request reads — the store is the source of truth, the api module is just where the client
 * can reach it without importing this file.
 *
 * Sign-in is an AdventWave account (RFC 0005): email and password, checked by the gateway.
 * `devLogin` is the local-development shortcut through the dev issuer, which a server turns off.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      /** @type {{ id: string, name: string, email: string, region: string | null, emailVerified?: boolean } | null} */
      user: null,
      /** @type {string | null} */
      token: null,

      /** Any signed-in answer from the gateway: register, login, a reset, a password change. */
      applySession: (session) => {
        setAuthToken(session.token)
        set({ token: session.token, user: session.user })
        return session.user
      },

      /** Throws ApiError with the server's words (wrong password, locked, too many attempts). */
      login: async (email, password) => get().applySession(await loginRequest(email.trim(), password)),

      register: async ({ email, password, name }) =>
        get().applySession(await registerRequest({ email: email.trim(), password, name: name?.trim() || undefined })),

      /** Local development only: the dev issuer checks no password. */
      // Absent from production builds, so the dev issuer's endpoint is not even referenced there.
      devLogin: import.meta.env.DEV
        ? async (email) => get().applySession(await createSession(email.trim(), email.trim().split('@')[0]))
        : undefined,

      /** Re-reads the account, e.g. after the email was verified in another tab. */
      refreshUser: async () => {
        try {
          const user = await getMe()
          set({ user })
        } catch {
          // A 401 already signed us out (App.jsx); anything else keeps the last known account.
        }
      },

      setUser: (user) => set({ user }),

      logout: () => {
        setAuthToken(null)
        set({ user: null, token: null })
        // The library and settings are another account's data the moment the token changes.
        useLibraryStore.getState().reset()
        useFriendsStore.getState().reset()
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
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token)
      },
    },
  ),
)
