import { create } from 'zustand'

let hideTimer

export const useToastStore = create((set) => ({
  message: null,
  showToast: (message) => {
    if (hideTimer) window.clearTimeout(hideTimer)
    set({ message: message?.trim() || 'Done' })
    hideTimer = window.setTimeout(() => {
      set({ message: null })
      hideTimer = undefined
    }, 2600)
  },
}))
