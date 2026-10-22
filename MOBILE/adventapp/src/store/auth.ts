import { create } from 'zustand';

import * as api from '@/api';
import { setAuthToken } from '@/api/client';
import type { ListenerSessionDto, UserDto } from '@/api/types';
import { readToken, writeToken } from '@/lib/storage';
import { useFriendsStore } from './friends';
import { useLibraryStore } from './library';
import { usePlayerStore } from './player';
import { useSettingsStore } from './settings';
import { useSleepTimerStore } from './sleepTimer';

/**
 * The signed-in account. The token is kept in the keychain (SecureStore), not with the rest of
 * the app's data; `restore` reads it at launch and asks the server who it belongs to. Sign-in is
 * an AdventWave account (RFC 0005), the same one the web app uses.
 */
interface AuthState {
  user: UserDto | null;
  token: string | null;
  /** False until the keychain has been read at launch; the splash stays up until then. */
  restored: boolean;
  restore: () => Promise<void>;
  applySession: (session: ListenerSessionDto) => Promise<UserDto | null>;
  login: (email: string, password: string) => Promise<UserDto | null>;
  register: (input: { email: string; password: string; name?: string }) => Promise<UserDto | null>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  restored: false,

  restore: async () => {
    const token = await readToken();
    if (!token) {
      set({ restored: true });
      return;
    }
    setAuthToken(token);
    set({ token });
    try {
      const user = await api.getMe();
      set({ user, restored: true });
    } catch (error) {
      if ((error as api.ApiError)?.status === 401) {
        // The session ended while the app was closed (expired, or signed out everywhere).
        setAuthToken(null);
        await writeToken(null);
        set({ token: null, user: null, restored: true });
        return;
      }
      // Offline at launch: keep the session and let the screens say they cannot reach us.
      set({ restored: true });
    }
  },

  applySession: async (session) => {
    if (!session?.token) return null;
    setAuthToken(session.token);
    await writeToken(session.token);
    set({ token: session.token, user: session.user ?? null });
    return session.user ?? null;
  },

  /** Throws ApiError with the server's words: wrong password, locked, too many attempts. */
  login: async (email, password) => get().applySession(await api.login(email.trim(), password)),

  register: async ({ email, password, name }) =>
    get().applySession(await api.register({ email: email.trim(), password, name: name?.trim() || undefined })),

  refreshUser: async () => {
    try {
      set({ user: await api.getMe() });
    } catch {
      // A 401 already signed us out; anything else keeps the last known account.
    }
  },

  logout: async () => {
    setAuthToken(null);
    set({ user: null, token: null });
    // Everything below is the previous account's the moment the token changes.
    useLibraryStore.getState().reset();
    useFriendsStore.getState().reset();
    usePlayerStore.getState().resetForLogout();
    useSettingsStore.getState().reset();
    useSleepTimerStore.getState().cancel();
    await writeToken(null);
  },
}));

// Any request the server answers 401 ends the session, wherever it came from.
api.onUnauthorized(() => {
  if (useAuthStore.getState().token) void useAuthStore.getState().logout();
});
