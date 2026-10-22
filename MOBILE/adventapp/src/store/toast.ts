import { create } from 'zustand';

let hideTimer: ReturnType<typeof setTimeout> | undefined;

interface ToastState {
  message: string | null;
  /** Bumps per toast, so the same words twice in a row still animate in again. */
  seq: number;
  showToast: (message: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  seq: 0,
  showToast: (message) => {
    if (hideTimer) clearTimeout(hideTimer);
    set((s) => ({ message: message?.trim() || 'Done', seq: s.seq + 1 }));
    hideTimer = setTimeout(() => {
      set({ message: null });
      hideTimer = undefined;
    }, 2600);
  },
}));

export const showToast = (message: string) => useToastStore.getState().showToast(message);
