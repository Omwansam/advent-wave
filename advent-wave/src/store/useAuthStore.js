import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      /** @type {{ name: string; email: string } | null} */
      user: null,

      login: (email, name) =>
        set({
          user: {
            email: email.trim(),
            name: name?.trim() || email.split('@')[0] || 'Listener',
          },
        }),

      logout: () => set({ user: null }),
    }),
    { name: 'adventwave-auth' },
  ),
)
