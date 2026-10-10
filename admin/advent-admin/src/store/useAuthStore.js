import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMe, signIn, signOutEverywhere } from '../api'
import { setAuthToken } from '../api/token'
import { isExpired } from '../lib/jwt'
import { useCatalogStore } from './useCatalogStore'

/**
 * The admin session: the bearer token and the account it belongs to. `setAuthToken` mirrors the
 * token into the api module, which is what every request reads.
 *
 * The account (role, permissions, mustChangePassword) is refreshed from GET /v1/admin/me when
 * the app opens, so a role changed elsewhere shows here. The client uses it only to decide what
 * to offer; the gateway re-checks the stored account on every request and refuses the rest.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      /** @type {string | null} */
      token: null,
      /**
       * @type {{ id: string, email: string, displayName: string, role: string,
       *          permissions: string[], mustChangePassword: boolean, lastLoginAt?: string } | null}
       */
      account: null,
      /** Why the last session ended, shown once on the sign-in screen. */
      notice: null,

      /** @throws {ApiError} with the server's message for the sign-in form. */
      signIn: async (email, password) => {
        const session = await signIn(email.trim(), password)
        get().applySession(session)
        return session.account
      },

      /** A new session from sign-in or a password change. */
      applySession: (session) => {
        setAuthToken(session.token)
        set({ token: session.token, account: session.account, notice: null })
      },

      /** Re-reads the account from the server. A 401 here ends the session via the client. */
      refresh: async () => {
        if (!get().token) return
        try {
          const account = await getMe()
          set({ account })
        } catch {
          // 401 already signed us out (main.jsx); anything else keeps the last known account.
        }
      },

      /** Clears this browser's session. With `everywhere`, first ends every session server-side. */
      signOut: async ({ everywhere = false, notice = null } = {}) => {
        if (everywhere && get().token) {
          try {
            await signOutEverywhere()
          } catch {
            // The local session ends regardless.
          }
        }
        setAuthToken(null)
        set({ token: null, account: null, notice })
        useCatalogStore.getState().reset()
      },

      clearNotice: () => set({ notice: null }),
    }),
    {
      name: 'adventwave-admin-auth',
      version: 2,
      // v1 held a token from the email-only dev issuer, which no longer opens the admin API.
      migrate: () => ({ token: null, account: null }),
      partialize: (state) => ({ token: state.token, account: state.account }),
      onRehydrateStorage: () => (state) => {
        if (!state?.token) return
        if (isExpired(state.token)) {
          state.signOut({ notice: 'Your session expired. Sign in again.' })
          return
        }
        setAuthToken(state.token)
      },
    },
  ),
)

/** Whether the signed-in account's role holds `permission`. For what to show; the server decides. */
export function useCan(permission) {
  return useAuthStore((s) => Boolean(s.account?.permissions?.includes(permission)))
}
