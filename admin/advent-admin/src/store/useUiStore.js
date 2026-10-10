import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Per-browser display preferences. Nothing here is catalogue state. */
export const useUiStore = create(
  persist(
    (set) => ({
      theme: systemTheme(),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'adventwave-admin-ui', version: 1 },
  ),
)
