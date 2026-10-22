import {
  createAudioPlaylist,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  type AudioLockScreenOptions,
  type AudioMetadata,
  type AudioPlaylist,
  type AudioPlaylistStatus,
} from 'expo-audio';
import { Platform } from 'react-native';

import type { Track } from '@/api/models';
import type { StreamManifestDto } from '@/api/types';
import { resolveUrl } from '@/lib/config';
import { isLongForm, trackSeconds } from '@/lib/longForm';
import { useLibraryStore } from '@/store/library';
import { peekNext, peekPrevious, usePlayerStore } from '@/store/player';
import { useProgressStore } from '@/store/progress';
import { useSettingsStore } from '@/store/settings';
import { useSleepTimerStore } from '@/store/sleepTimer';
import { showToast } from '@/store/toast';
import { forgetManifest, gainToVolume, loadManifest, peekManifest, urlExpiresAt } from './manifest';
import { reporter } from './reporter';

/**
 * The one thing on the phone that makes sound.
 *
 * It is an expo-audio AudioPlaylist rather than a player per item, for two reasons: the
 * playlist hands from one item to the next without a gap — the next item is already buffered
 * when the current one ends — and it is the only object whose lock-screen and headset
 * Next/Previous buttons do anything.
 *
 * The player store stays the source of truth for *what* plays; this follows it. The playlist
 * holds a window of the queue: what has played since the last jump, the current item, and the
 * next one. The next is added as soon as the current starts (for a long sermon, once it is
 * close to the end, so its signed URL is still good when it is reached). When the listener
 * presses Next and the next is already in the window, the playlist just advances — no request,
 * no buffering. Anything else (a tap on another song, a reshuffle) rebuilds the window around
 * the new item. When the playlist moves on its own — an item ended, or the lock screen's
 * Next/Previous — `trackChanged` moves the store to match.
 */

/** Add the next item once the current has this little left, so the next one's URL is fresh. */
const QUEUE_NEXT_WITHIN_SEC = 10 * 60;
/** An item that has not loaded in this long is not going to. */
const LOAD_TIMEOUT_MS = 15_000;
/** Our own commands make the playlist report a pause on the way; that is not the listener pausing. */
const COMMAND_GRACE_MS = 1500;
/** In the app, Previous restarts the item past this point, as every music app does. */
const RESTART_THRESHOLD_SEC = 3;
/** A signed URL with less life than this left is fetched again rather than handed to the player. */
const MIN_URL_LIFE_MS = 90_000;
/** A run of items that will not play is a problem with the network, not with each item. */
const MAX_CONSECUTIVE_FAILURES = 3;
/** Seconds a long-form item's position is recorded at, while it plays. */
const PROGRESS_EVERY_SEC = 5;

interface Slot {
  id: string;
  track: Track;
  expiresAt: number;
  gain: number;
  durationSec: number;
}

let pl: AudioPlaylist | null = null;
/** Mirrors the playlist's sources, in order. */
let windowSlots: Slot[] = [];
/** Index of the playing slot in `windowSlots`. */
let cur = 0;
/** Bumps on every rebuild; async work started for an older window is dropped. */
let gen = 0;
/** The current item has been chosen but not loaded: a restored queue waits for Play. */
let needsLoad = false;
let rebuilding = false;
let nextLoading: string | null = null;
let pendingSeek: { id: string; sec: number } | null = null;
/** Volume to restore once a resume seek has landed; muted until then so the top is not heard. */
let volumeAfterSeek: number | null = null;
let lastCommandAt = 0;
let nativePlaying = false;
let failures = 0;
let lockScreenActive = false;
let lockScreenLongForm: boolean | null = null;
let lastProgressSec = -Infinity;
/** The last position the playlist reported, and for which item: what a flush records. */
let lastPos: { slot: Slot; time: number; duration: number } | null = null;
let loadWatch: ReturnType<typeof setTimeout> | undefined;
/** Next items whose manifest just failed, so the status ticks do not ask again every 500 ms. */
const nextFailedAt = new Map<string, number>();
let sleepTimer: ReturnType<typeof setTimeout> | undefined;
let notificationsAsked = false;

const store = () => usePlayerStore.getState();

function command<T>(fn: (p: AudioPlaylist) => T): T | undefined {
  if (!pl) return undefined;
  lastCommandAt = Date.now();
  return fn(pl);
}

/**
 * An item that never loads sends no status at all on iOS, so the check is a timer: if the same
 * item is still not loaded when it fires and the store still wants sound, it has failed.
 */
function armLoadWatch() {
  if (loadWatch) clearTimeout(loadWatch);
  const g = gen;
  const id = store().currentSong?.id;
  loadWatch = setTimeout(() => {
    loadWatch = undefined;
    const s = store();
    if (!pl || g !== gen || !id || s.currentSong?.id !== id || !s.isPlaying) return;
    const loaded = hasLoaded({ isLoaded: pl.isLoaded, duration: pl.duration, currentTime: pl.currentTime });
    if (currentSlot()?.id === id && loaded) return;
    if (rebuilding || !loaded) failed(s.currentSong, new Error('Timed out'));
  }, LOAD_TIMEOUT_MS);
}

/**
 * Whether the current item has loaded. expo-audio's web playlist clears `isLoaded` when it moves
 * to the item it preloaded and never sets it again (that element's `loadeddata` fired before
 * the playlist listened), so a known length or a moving position counts too. Native players
 * report `isLoaded` faithfully; for them this changes nothing.
 */
function hasLoaded(status: Pick<AudioPlaylistStatus, 'isLoaded' | 'duration' | 'currentTime'>): boolean {
  return status.isLoaded || status.duration > 0 || status.currentTime > 0;
}

/** The position of the last status, to tell real buffering from the web playlist's stale flag. */
let lastStatusTime = -1;

function currentSlot(): Slot | undefined {
  return windowSlots[cur];
}

/**
 * Whether a slot's URL still has life left when its item starts, `inSec` from now — the web
 * player's rule. A bucket URL is signed for the recording plus 30 minutes, so one that is good
 * at the start lasts the item; the player follows it once and keeps the connection.
 */
function freshFor(slot: Slot, inSec = 0): boolean {
  return slot.expiresAt - Date.now() > inSec * 1000 + MIN_URL_LIFE_MS;
}

function slotFor(track: Track, manifest: StreamManifestDto): Slot {
  return {
    id: track.id,
    track,
    expiresAt: urlExpiresAt(manifest),
    gain: gainToVolume(manifest.gainDb),
    durationSec: (manifest.durationMs ?? 0) / 1000 || trackSeconds(track),
  };
}

function source(manifest: StreamManifestDto) {
  return { uri: manifest.audioUrl as string };
}

/* ------------------------------------------------------------------ per-item settings */

function targetVolume(slot: Slot | undefined): number {
  return slot && useSettingsStore.getState().normalizeAudio ? slot.gain : 1;
}

function applyItemSettings() {
  const slot = currentSlot();
  if (!pl || !slot) return;
  pl.playbackRate = isLongForm(slot.track) ? store().playbackRate : 1;
  if (volumeAfterSeek == null) pl.volume = targetVolume(slot);
  else volumeAfterSeek = targetVolume(slot);
  const { repeat, queue } = store();
  pl.loop = repeat === 'one' || (repeat === 'all' && queue.length === 1) ? 'single' : 'none';
}

function metadataFor(track: Track): AudioMetadata {
  return {
    title: track.title,
    artist: track.artist ?? undefined,
    albumTitle: track.album ?? undefined,
    artworkUrl: resolveUrl(track.cover),
  };
}

/**
 * The lock screen, notification shade, headset and car. Android also needs this for playback
 * to survive in the background past a few minutes. Seek buttons replace Next/Previous for
 * sermons, where jumping back 15 seconds is what a listener wants.
 */
function updateLockScreen() {
  const slot = currentSlot();
  if (!pl || !slot) return;
  const longForm = isLongForm(slot.track);
  if (!lockScreenActive || lockScreenLongForm !== longForm) {
    const options: AudioLockScreenOptions = {
      showNextTrack: true,
      showPreviousTrack: true,
      showSeekForward: longForm,
      showSeekBackward: longForm,
      seekForwardIntervalSeconds: 30,
      seekBackwardIntervalSeconds: 15,
    };
    pl.setActiveForLockScreen(true, metadataFor(slot.track), options);
    lockScreenActive = true;
    lockScreenLongForm = longForm;
  } else {
    pl.updateLockScreenMetadata(metadataFor(slot.track));
  }
}

function clearLockScreen() {
  if (!pl || !lockScreenActive) return;
  pl.clearLockScreenControls();
  lockScreenActive = false;
  lockScreenLongForm = null;
}

/* ------------------------------------------------------------------ the window */

/**
 * Starts over around the store's current item: clears the playlist, loads the item's manifest
 * (already cached if the listener's press prefetched it), and plays if the store wants sound.
 */
function rebuild(opts: { startAt?: number } = {}) {
  if (!pl) return;
  const s = store();
  const track = s.currentSong;
  const g = ++gen;
  needsLoad = false;
  nextLoading = null;
  command((p) => p.clear());
  windowSlots = [];
  cur = 0;
  nativePlaying = false;
  if (!track) {
    rebuilding = false;
    clearLockScreen();
    s.setBuffering(false);
    return;
  }

  rebuilding = true;
  if (s.isPlaying) {
    s.setBuffering(true);
    armLoadWatch();
  }

  // Where to start: an explicit position, the account's saved position for a restored queue,
  // or where a sermon was left.
  let startAt = opts.startAt;
  if (startAt == null && s.pendingSeekId === track.id && s.pendingSeekSec != null) startAt = s.pendingSeekSec;
  if (s.pendingSeekId != null) s.clearPendingSeek();
  if (startAt == null && isLongForm(track)) startAt = useProgressStore.getState().resumeAt(track.id) ?? undefined;
  pendingSeek = startAt && startAt > 1 ? { id: track.id, sec: startAt } : null;

  loadManifest(track.id)
    .then((manifest) => {
      if (g !== gen || !pl) return;
      rebuilding = false;
      forgetManifest(track.id);
      const slot = slotFor(track, manifest);
      windowSlots = [slot];
      cur = 0;
      // Muted until the resume seek lands, so the opening seconds are not heard first.
      volumeAfterSeek = pendingSeek ? targetVolume(slot) : null;
      reporter.setDuration(slot.durationSec);
      command((p) => p.add(source(manifest)));
      applyItemSettings();
      if (pendingSeek) pl.volume = 0;
      if (store().isPlaying) startPlaying();
      ensureNext();
      insertPreviousIfCheap();
    })
    .catch((error) => {
      if (g !== gen) return;
      rebuilding = false;
      failed(track, error);
    });
}

/**
 * The item after the current one, in the window and with a URL that will still be good when
 * it is reached. Anything else after the current item (a queue that changed) comes out first;
 * removing after the current item never interrupts it.
 */
function ensureNext() {
  if (!pl || rebuilding || needsLoad || !currentSlot()) return;
  const s = store();
  const next = peekNext(s);

  const following = windowSlots[cur + 1];
  const keep = following && next && following.id === next.id;
  const remaining = Math.max(0, (s.duration || currentSlot()?.durationSec || 0) - s.currentTime);
  if (keep && freshFor(following, remaining)) {
    trimAfter(cur + 1);
    return;
  }
  trimAfter(cur);
  if (!next) return;
  // A long sermon's next item is fetched near its end: a URL signed now might not last.
  if (remaining > QUEUE_NEXT_WITHIN_SEC) return;
  if (nextLoading === next.id) return;
  if (Date.now() - (nextFailedAt.get(next.id) ?? 0) < 15_000) return;

  const g = gen;
  nextLoading = next.id;
  loadManifest(next.id)
    .then((manifest) => {
      if (nextLoading === next.id) nextLoading = null;
      if (g !== gen || !pl) return;
      const st = store();
      if (peekNext(st)?.id !== next.id) {
        ensureNext();
        return;
      }
      trimAfter(cur);
      forgetManifest(next.id);
      command((p) => p.add(source(manifest)));
      windowSlots.push(slotFor(next, manifest));
    })
    .catch(() => {
      if (nextLoading === next.id) nextLoading = null;
      nextFailedAt.set(next.id, Date.now());
      // Not now; when the listener reaches it, the ordinary load tries again and reports.
    });
}

function trimAfter(index: number) {
  for (let i = windowSlots.length - 1; i > index; i -= 1) {
    command((p) => p.remove(i));
    windowSlots.splice(i, 1);
  }
}

/**
 * Lock-screen Previous only works when the previous item is in the playlist. Adding it in front
 * of a playing item is free on Android and the web; on iOS it would restart the current item,
 * so there the window only holds what has been played since the last jump.
 */
function insertPreviousIfCheap() {
  if (Platform.OS === 'ios' || !pl || cur !== 0) return;
  const prev = peekPrevious(store());
  const slot = currentSlot();
  if (!prev || !slot || prev.id === slot.id) return;
  const g = gen;
  loadManifest(prev.id)
    .then((manifest) => {
      if (g !== gen || !pl || cur !== 0 || currentSlot()?.id !== slot.id) return;
      if (peekPrevious(store())?.id !== prev.id) return;
      forgetManifest(prev.id);
      command((p) => p.insert(source(manifest), 0));
      windowSlots.unshift(slotFor(prev, manifest));
      cur = 1;
    })
    .catch(() => undefined);
}

/* ------------------------------------------------------------------ store → playlist */

function startPlaying() {
  if (!pl) return;
  const slot = currentSlot();
  if (!slot) return;
  if (Platform.OS === 'android' && !notificationsAsked) {
    notificationsAsked = true;
    // The media notification is how Android keeps background audio alive (Android 13+ asks).
    requestNotificationPermissionsAsync().catch(() => undefined);
  }
  updateLockScreen();
  const status = pl.currentStatus;
  if (status.duration > 0 && status.currentTime >= status.duration - 0.5 && !status.playing) {
    // Ended (Android leaves a finished playlist at its end): play means from the top.
    void command((p) => p.seekTo(0));
  }
  command((p) => p.play());
  reporter.started(slot.track, slot.durationSec);
}

function onCurrentChanged() {
  if (!pl) return;
  const s = store();
  const track = s.currentSong;
  flushProgress();
  reporter.ended();
  lastProgressSec = -Infinity;
  lastPos = null;
  if (!track) {
    gen += 1;
    command((p) => p.clear());
    windowSlots = [];
    cur = 0;
    needsLoad = false;
    rebuilding = false;
    clearLockScreen();
    return;
  }

  if (!s.isPlaying && !lockScreenActive && !rebuilding) {
    // A restored queue: nothing is fetched until the listener presses Play.
    gen += 1;
    command((p) => p.clear());
    windowSlots = [];
    cur = 0;
    needsLoad = true;
    return;
  }

  const here = windowSlots[cur];
  if (here?.id === track.id) {
    // The playlist moved first (an item ended, or the lock screen); the store has caught up.
    if (!freshFor(here)) {
      rebuild();
      return;
    }
    afterMove();
    return;
  }
  if (windowSlots[cur + 1]?.id === track.id && freshFor(windowSlots[cur + 1])) {
    cur += 1;
    command((p) => p.next());
    afterMove();
    return;
  }
  if (cur > 0 && windowSlots[cur - 1]?.id === track.id && freshFor(windowSlots[cur - 1])) {
    cur -= 1;
    command((p) => p.previous());
    afterMove();
    return;
  }
  rebuild();
}

/** The current slot changed without a rebuild. */
function afterMove() {
  const slot = currentSlot();
  if (!slot) return;
  if (volumeAfterSeek != null) {
    // A resume seek that never landed must not leave the next item muted.
    volumeAfterSeek = null;
  }
  pendingSeek = null;
  if (isLongForm(slot.track)) {
    const resume = useProgressStore.getState().resumeAt(slot.id);
    if (resume) pendingSeek = { id: slot.id, sec: resume };
  }
  applyItemSettings();
  if (store().isPlaying) armLoadWatch();
  if (store().isPlaying) startPlaying();
  else command((p) => p.pause());
  ensureNext();
}

function onPlayingChanged(want: boolean) {
  if (!pl) return;
  if (!want) {
    if (nativePlaying || pl.playing) command((p) => p.pause());
    store().setBuffering(false);
    flushProgress();
    return;
  }
  const slot = currentSlot();
  if (needsLoad || (!slot && !rebuilding)) {
    rebuild();
    return;
  }
  if (rebuilding || !slot) return; // It plays when it loads.
  const s = store();
  if (!freshFor(slot)) {
    // Paused long enough for the URL to lapse (a sermon left overnight): pick up where it was.
    rebuild({ startAt: s.currentTime });
    return;
  }
  startPlaying();
  // The next item's URL may have lapsed during a long pause too.
  ensureNext();
}

/* ------------------------------------------------------------------ playlist → store */

function onTrackChanged({ currentIndex }: { currentIndex: number; previousIndex: number }) {
  const fromWindow = windowSlots[currentIndex];
  const previous = currentSlot();
  cur = currentIndex;
  if (!fromWindow || previous?.id === fromWindow.id) return;
  // An item that was within a couple of seconds of its end ran out; anything else was a skip
  // from the lock screen or a headset.
  const ranOut =
    lastPos != null &&
    lastPos.slot.id === previous?.id &&
    lastPos.duration > 0 &&
    lastPos.duration - lastPos.time < 2.5;
  if (ranOut && previous && isLongForm(previous.track)) {
    useProgressStore.getState().markFinished(previous.id, previous.durationSec);
  }

  const s = store();
  if (s.currentSong?.id !== fromWindow.id) {
    if (peekNext(s)?.id === fromWindow.id) s.nextSong();
    else if (peekPrevious(s)?.id === fromWindow.id) s.prevSong();
    else {
      const i = s.queue.findIndex((t) => t.id === fromWindow.id);
      if (i >= 0) s.jumpToQueueIndex(i);
      // Taken out of the queue just as it began: go back to what the store says is playing.
      else rebuild();
    }
  }
  if (ranOut && useSleepTimerStore.getState().endOfItem) {
    useSleepTimerStore.getState().cancel();
    store().setPlaying(false);
  }
}

function onStatus(status: AudioPlaylistStatus) {
  const s = store();
  const slot = currentSlot();
  const error = (status as AudioPlaylistStatus & { error?: { message?: string } }).error;
  if (error && slot) {
    failed(slot.track, new Error(error.message ?? 'Playback failed'));
    return;
  }

  const loaded = hasLoaded(status);
  const advancing = status.playing && status.currentTime > lastStatusTime && lastStatusTime >= 0;
  lastStatusTime = status.currentTime;

  if (pendingSeek && slot && pendingSeek.id === slot.id && loaded && status.duration > 0) {
    const { sec } = pendingSeek;
    pendingSeek = null;
    void Promise.resolve(command((p) => p.seekTo(Math.min(sec, Math.max(0, status.duration - 2))))).finally(() => {
      if (pl && volumeAfterSeek != null) pl.volume = volumeAfterSeek;
      volumeAfterSeek = null;
    });
  }

  if (slot && !rebuilding && loaded) {
    lastPos = { slot, time: status.currentTime, duration: status.duration || slot.durationSec };
    reporter.tick(status.currentTime, status.playing);
    s.setProgress(status.currentTime, status.duration);
    if (isLongForm(slot.track) && status.duration > 0) {
      if (Math.abs(status.currentTime - lastProgressSec) >= PROGRESS_EVERY_SEC) {
        lastProgressSec = status.currentTime;
        useProgressStore.getState().record(slot.id, status.currentTime, status.duration);
      }
    }
  }

  if (loaded && status.playing) failures = 0;
  const waiting = s.isPlaying && (rebuilding || !loaded || (status.isBuffering && !advancing));
  s.setBuffering(waiting);

  const wasPlaying = nativePlaying;
  nativePlaying = status.playing;
  const ours = Date.now() - lastCommandAt < COMMAND_GRACE_MS;
  const ended =
    pl?.loop !== 'single' &&
    (status.didJustFinish ||
    (wasPlaying && !status.playing && status.duration > 0 && status.currentTime >= status.duration - 0.75));

  if (ended && !ours) {
    // The last item in the window finished: the queue has nothing after it, or its next item
    // had not arrived in time. The store decides which.
    if (slot && isLongForm(slot.track)) useProgressStore.getState().markFinished(slot.id, slot.durationSec);
    if (useSleepTimerStore.getState().endOfItem) {
      useSleepTimerStore.getState().cancel();
      s.setPlaying(false);
      return;
    }
    const next = peekNext(s);
    if (next) s.nextSong();
    else s.setPlaying(false);
    return;
  }
  if (ours || rebuilding) return;
  // Paused or resumed from outside the app: the lock screen, a headset, a phone call.
  if (wasPlaying && !status.playing && !status.isBuffering && loaded && s.isPlaying) s.setPlaying(false);
  else if (!wasPlaying && status.playing && !s.isPlaying) s.setPlaying(true);

  // A long item's next is queued once it is close to its end.
  if (slot && !windowSlots[cur + 1] && peekNext(s) && status.duration - status.currentTime <= QUEUE_NEXT_WITHIN_SEC) {
    ensureNext();
  }
}

function failed(track: Track, error: unknown) {
  forgetManifest(track.id);
  failures += 1;
  const s = store();
  if (s.currentSong?.id !== track.id) return;
  const message = (error as Error)?.message;
  showToast(`Couldn't play ${track.title}${message && message.length < 60 ? `: ${message}` : ''}`);
  // A dead item is skipped, as the web player does; a dead network stops the queue.
  if (failures < MAX_CONSECUTIVE_FAILURES && peekNext(s)) s.nextSong();
  else {
    failures = 0;
    s.setPlaying(false);
    s.setBuffering(false);
    needsLoad = true;
  }
}

function flushProgress() {
  if (!lastPos || !isLongForm(lastPos.slot.track) || !(lastPos.duration > 0)) return;
  useProgressStore.getState().record(lastPos.slot.id, lastPos.time, lastPos.duration, { flush: true });
}

/* ------------------------------------------------------------------ sleep timer */

function armSleepTimer(endsAt: number | null) {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = undefined;
  if (endsAt == null) return;
  sleepTimer = setTimeout(
    () => {
      sleepTimer = undefined;
      useSleepTimerStore.getState().cancel();
      store().setPlaying(false);
    },
    Math.max(0, endsAt - Date.now()),
  );
}

/* ------------------------------------------------------------------ public */

/** Seeks the current item; from the scrubber, the lyrics and the chapter list. */
export function seekTo(sec: number) {
  const slot = currentSlot();
  const s = store();
  const to = Math.max(0, s.duration > 0 ? Math.min(sec, s.duration - 0.5) : sec);
  s.setProgress(to);
  if (!slot || needsLoad) {
    // Not loaded yet (a restored queue): remember it for when it is.
    if (s.currentSong) pendingSeek = { id: s.currentSong.id, sec: to };
    return;
  }
  void command((p) => p.seekTo(to));
  reporter.seeked(to);
  if (lastPos?.slot.id === slot.id) lastPos = { ...lastPos, time: to };
  flushProgress();
}

export function skipBy(deltaSec: number) {
  seekTo(store().currentTime + deltaSec);
}

/** The in-app Previous: restart past a few seconds in, else the previous item. */
export function previous() {
  const s = store();
  if (s.currentTime > RESTART_THRESHOLD_SEC || !s.prevSong()) seekTo(0);
}

export function next() {
  store().nextSong();
}

/** Warms the manifest for an item the listener is about to pick. */
export { prefetchManifest } from './manifest';

/** The manifest already in hand for an item, if any; for the full player's quality badge. */
export function cachedManifest(id: string) {
  return peekManifest(id);
}

/**
 * Starts the engine once, for the app's lifetime. Returns a function that stops following
 * the stores (the playlist itself lives on; there is one per app).
 */
export function startEngine(): () => void {
  if (!pl) {
    pl = createAudioPlaylist({ updateInterval: 500, loop: 'none' });
    pl.addListener('trackChanged', onTrackChanged);
    pl.addListener('playlistStatusUpdate', onStatus);
  }
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => undefined);

  const unsubPlayer = usePlayerStore.subscribe((s, prev) => {
    if (s.currentSong?.id !== prev.currentSong?.id) onCurrentChanged();
    else if (s.queue !== prev.queue || s.currentIndex !== prev.currentIndex || s.repeat !== prev.repeat) {
      applyItemSettings();
      ensureNext();
      if (cur === 0) insertPreviousIfCheap();
    }
    if (s.isPlaying !== prev.isPlaying) onPlayingChanged(s.isPlaying);
    if (s.playbackRate !== prev.playbackRate) applyItemSettings();
    if (s.currentSong && s.isPlaying && !prev.isPlaying) useLibraryStore.getState().recordTrackPlay(s.currentSong.id);
  });
  const unsubSettings = useSettingsStore.subscribe((s, prev) => {
    if (s.normalizeAudio !== prev.normalizeAudio) applyItemSettings();
  });
  const unsubSleep = useSleepTimerStore.subscribe((s, prev) => {
    if (s.endsAt !== prev.endsAt) armSleepTimer(s.endsAt);
  });

  // A queue already in the store (restored before the engine started) waits for Play.
  if (store().currentSong && !windowSlots.length) needsLoad = true;

  return () => {
    unsubPlayer();
    unsubSettings();
    unsubSleep();
    armSleepTimer(null);
  };
}

/** Signing out: silence, and nothing of the last account's left on the lock screen. */
export function stopEngine() {
  flushProgress();
  reporter.ended();
  lastPos = null;
  gen += 1;
  command((p) => p.clear());
  windowSlots = [];
  cur = 0;
  needsLoad = false;
  rebuilding = false;
  clearLockScreen();
}
