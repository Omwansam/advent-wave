import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createJSONStorage } from 'zustand/middleware';

/**
 * The bearer token lives in the platform keychain (SecureStore); everything else the stores
 * persist (preferences, recent searches, sermon progress) is ordinary app data. The web build,
 * used for development, has no keychain, so the token falls back to localStorage there.
 */
const TOKEN_KEY = 'adventwave.session';

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A keychain the OS cannot unlock (restored backup, changed device passcode) holds no session.
    return null;
  }
}

export async function writeToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const appStorage = createJSONStorage(() => AsyncStorage);
