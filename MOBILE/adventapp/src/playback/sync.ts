import { AppState } from 'react-native';

import { getAutoplay, getPlayerState, savePlayerState, type PlayerSnapshot } from '@/api';
import { asTracks } from '@/api/models';
import { usePlayerStore } from '@/store/player';
import { useSettingsStore } from '@/store/settings';

/**
 * Keeps the player on the account (player_state), so the listener picks up on the laptop where
 * they stopped on the phone, and keeps the queue going when it runs out (autoplay, RFC 0004).
 * Both are the web app's rules (usePlayerSync, useAutoplay), as plain store subscriptions.
 *
 * Structure (item, queue, shuffle, repeat) is pushed after a short debounce; position at most
 * every 10 s while playing, and at once on pause, item change, and the app going to the
 * background. Nothing is written until the account's copy has been read.
 */
const STRUCTURE_DEBOUNCE_MS = 400;
const POSITION_INTERVAL_MS = 10_000;
const AUTOPLAY_SEEDS = 5;
const AUTOPLAY_BATCH = 10;

type S = ReturnType<typeof usePlayerStore.getState>;

function snapshot(s: S): PlayerSnapshot {
  return {
    currentSongId: s.currentSong?.id ?? null,
    queue: s.queue.map((t) => t.id),
    orderedQueue: s.orderedQueue ? s.orderedQueue.map((t) => t.id) : null,
    currentIndex: s.currentIndex,
    positionMs: Math.max(0, Math.round((s.currentTime || 0) * 1000)),
    volume: s.volume,
    shuffle: s.shuffle,
    repeat: s.repeat,
  };
}

function structureKey(s: S): string {
  return [
    s.currentSong?.id ?? '',
    s.queue.map((t) => t.id).join(','),
    s.orderedQueue ? s.orderedQueue.map((t) => t.id).join(',') : '',
    s.currentIndex,
    s.shuffle,
    s.repeat,
  ].join('|');
}

/** Starts syncing for the signed-in account; returns the function that stops it. */
export function startPlayerSync(): () => void {
  let cancelled = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let lastPositionPush = 0;
  let askedAutoplayFor: string | null = null;

  getPlayerState()
    .then((state) => {
      if (!cancelled) usePlayerStore.getState().hydrateFromServer(state);
    })
    .catch(() => {
      if (!cancelled) usePlayerStore.getState().hydrateFromServer(null);
    });

  const push = () => {
    const s = usePlayerStore.getState();
    if (!s.hydrated || cancelled) return;
    lastPositionPush = Date.now();
    savePlayerState(snapshot(s)).catch(() => {
      // The next change retries; position is all that is lost, and only ≤10 s of it.
    });
  };

  let prev = usePlayerStore.getState();
  let prevKey = structureKey(prev);

  const unsubscribe = usePlayerStore.subscribe((s) => {
    const before = prev;
    prev = s;
    if (!s.hydrated) return;

    const key = structureKey(s);
    const songChanged = s.currentSong?.id !== before.currentSong?.id;
    const paused = before.isPlaying && !s.isPlaying;
    if (key !== prevKey) {
      prevKey = key;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(push, STRUCTURE_DEBOUNCE_MS);
    } else if (paused || songChanged) {
      push();
    } else if (s.isPlaying && Date.now() - lastPositionPush >= POSITION_INTERVAL_MS) {
      push();
    }

    maybeAutoplay(s);
  });

  /**
   * When the last item in the queue starts, ask for more like what has been playing and append
   * it — at the start of the last item, not its end, so the engine has a next item to buffer.
   */
  function maybeAutoplay(s: S) {
    if (!useSettingsStore.getState().autoplay) return;
    const current = s.currentSong;
    if (!current || !s.isPlaying || s.repeat !== 'off') return;
    if (s.currentIndex < s.queue.length - 1) return;
    const key = `${current.id}@${s.queue.length}`;
    if (askedAutoplayFor === key) return;
    askedAutoplayFor = key;

    const seeds = s.queue.slice(Math.max(0, s.currentIndex - AUTOPLAY_SEEDS + 1), s.currentIndex + 1).map((t) => t.id);
    const queueLength = s.queue.length;
    getAutoplay(seeds)
      .then((res) => {
        const st = usePlayerStore.getState();
        // The listener moved on, or queued something themselves: theirs comes first.
        if (st.currentSong?.id !== current.id || st.queue.length !== queueLength) return;
        const queued = new Set(st.queue.map((t) => t.id));
        const fresh = asTracks(res?.tracks)
          .filter((t) => !queued.has(t.id))
          .slice(0, AUTOPLAY_BATCH)
          .map((t) => ({ ...t, autoplay: true }));
        if (fresh.length) st.enqueueSongs(fresh);
      })
      .catch(() => {
        // Nothing to add: the queue ends.
      });
  }

  // Leaving the app is the last chance to save where the listener is.
  const appState = AppState.addEventListener('change', (next) => {
    if (next !== 'active') push();
  });

  return () => {
    cancelled = true;
    unsubscribe();
    appState.remove();
    if (debounce) clearTimeout(debounce);
  };
}
