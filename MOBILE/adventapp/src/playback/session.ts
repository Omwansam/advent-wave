import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useFriendsStore } from '@/store/friends';
import { useLibraryStore } from '@/store/library';
import { useProgressStore } from '@/store/progress';
import { useSettingsStore } from '@/store/settings';
import { startEngine, stopEngine } from './engine';
import { clearManifests } from './manifest';
import { startPlayerSync } from './sync';

/**
 * Everything that runs for a signed-in account: the account's library, settings, sermon progress
 * and friends loaded; its player state followed and saved; and, for the app's whole life, the
 * playback engine. Signing out stops the sound and every sync.
 */
export function useSession(token: string | null) {
  useEffect(() => startEngine(), []);

  useEffect(() => {
    if (!token) return undefined;
    const stopSync = startPlayerSync();
    void useLibraryStore.getState().load();
    void useSettingsStore.getState().hydrate();
    void useProgressStore.getState().hydrate();
    void useFriendsStore.getState().load();

    // Back from the background: another device may have changed the library or settings.
    let last = Date.now();
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - last < 60_000) return;
      last = Date.now();
      void useLibraryStore.getState().load();
      void useSettingsStore.getState().hydrate();
    });

    // A different quality is a different signed profile: cached manifests are for the old one.
    const unsubQuality = useSettingsStore.subscribe((s, prev) => {
      if (s.audioQuality !== prev.audioQuality) clearManifests();
    });

    return () => {
      stopSync();
      appState.remove();
      unsubQuality();
      stopEngine();
    };
  }, [token]);
}
