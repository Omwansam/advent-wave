import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getSettings, updateSettings } from '@/api';
import type { UserSettingsDto } from '@/api/types';
import { appStorage } from '@/lib/storage';

/**
 * The account's settings (user_settings), owned by the server: they hold across devices, and
 * the server acts on some of them — private session keeps plays out of history, audio quality
 * picks the stream profile. A change applies here at once and is pushed after a short debounce,
 * as the web app's useUiStore does. Fields this app has no control for (the web's sidebar,
 * crossfade) are carried through untouched, so saving here never resets them there.
 */
export type AudioQuality = 'data_saver' | 'normal' | 'high' | 'very_high';

interface Settings {
  theme: 'light' | 'dark';
  privateSession: boolean;
  normalizeAudio: boolean;
  crossfadeEnabled: boolean;
  crossfadeSec: number;
  sidebarCollapsed: boolean;
  friendActivityCollapsed: boolean;
  audioQuality: string;
  autoplay: boolean;
  shareActivity: boolean;
}

const SERVER_FIELDS: (keyof Settings)[] = [
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
];

const DEFAULTS: Settings = {
  theme: 'dark',
  privateSession: false,
  normalizeAudio: false,
  crossfadeEnabled: false,
  crossfadeSec: 6,
  sidebarCollapsed: false,
  friendActivityCollapsed: false,
  audioQuality: 'normal',
  autoplay: true,
  shareActivity: true,
};

interface SettingsState extends Settings {
  settingsHydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const PUSH_DELAY_MS = 400;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

function serverSettings(state: Settings): UserSettingsDto {
  return Object.fromEntries(SERVER_FIELDS.map((key) => [key, state[key]])) as UserSettingsDto;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      settingsHydrated: false,

      hydrate: async () => {
        try {
          const settings = await getSettings();
          const known = Object.fromEntries(
            Object.entries(settings ?? {}).filter(([k, v]) => SERVER_FIELDS.includes(k as keyof Settings) && v != null),
          );
          set({ ...known, settingsHydrated: true });
        } catch {
          // Offline: keep what is on screen and try again next launch.
        }
      },

      reset: () => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = undefined;
        set({ settingsHydrated: false });
      },

      set: (key, value) => {
        set({ [key]: value } as Partial<Settings>);
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          pushTimer = undefined;
          const state = get();
          // Never before the account's copy arrived: that would push this device's
          // values over the account's.
          if (!state.settingsHydrated) return;
          updateSettings(serverSettings(state)).catch(() => {
            // The next change retries, and the next launch re-reads the server's copy.
          });
        }, PUSH_DELAY_MS);
      },
    }),
    {
      name: 'adventwave-settings',
      storage: appStorage,
      // Only so the first frame after launch is not a flash of defaults.
      partialize: (s) => Object.fromEntries(SERVER_FIELDS.map((k) => [k, s[k]])) as Partial<SettingsState>,
    },
  ),
);
