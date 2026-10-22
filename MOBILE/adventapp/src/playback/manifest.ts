import { getStreamManifest } from '@/api';
import type { StreamManifestDto } from '@/api/types';

/**
 * Stream manifests, fetched once per play and shared between whoever asks first: the engine
 * when an item starts, the engine again for the item after it, and a row the listener is
 * pressing on. A manifest's URL is signed and expires (`expiresAtEpochSeconds`: the recording
 * plus 30 minutes from signing), so a cached one is only handed out while it has time left —
 * the same rules as the web app's usePlaybackSource.
 */
const MAX_AGE_MS = 25 * 60_000;
const MIN_URL_LIFE_MS = 90_000;

interface Entry {
  at: number;
  manifest: StreamManifestDto | null;
  promise: Promise<StreamManifestDto>;
}

const cache = new Map<string, Entry>();

export function urlExpiresAt(manifest: StreamManifestDto | null | undefined): number {
  const s = manifest?.expiresAtEpochSeconds;
  return s ? s * 1000 : Number.POSITIVE_INFINITY;
}

function usable(entry: Entry, now = Date.now()): boolean {
  if (now - entry.at > MAX_AGE_MS) return false;
  return !entry.manifest || urlExpiresAt(entry.manifest) - now > MIN_URL_LIFE_MS;
}

/** A manifest for `id`: the cached one while its URL has time left, else a fresh request. */
export function loadManifest(id: string): Promise<StreamManifestDto> {
  const hit = cache.get(id);
  if (hit && usable(hit)) return hit.promise;
  for (const [key, e] of cache) if (!usable(e)) cache.delete(key);
  const entry: Entry = { at: Date.now(), manifest: null, promise: Promise.resolve({}) };
  entry.promise = getStreamManifest(id).then(
    (manifest) => {
      if (!manifest?.audioUrl) {
        cache.delete(id);
        throw new Error('This item has no audio yet.');
      }
      entry.manifest = manifest;
      return manifest;
    },
    (error) => {
      cache.delete(id);
      throw error;
    },
  );
  cache.set(id, entry);
  return entry.promise;
}

/** A manifest that has arrived and is still good, without waiting. */
export function peekManifest(id: string): StreamManifestDto | null {
  const hit = cache.get(id);
  return hit?.manifest && usable(hit) ? hit.manifest : null;
}

/** Warm the cache for something the listener is reaching for; errors surface on the real load. */
export function prefetchManifest(id: string | undefined): void {
  if (!id) return;
  loadManifest(id).catch(() => undefined);
}

/** A used manifest is dropped so a later play of the same item signs a fresh URL. */
export function forgetManifest(id: string): void {
  cache.delete(id);
}

/** Changing audio quality changes which profile the server signs. */
export function clearManifests(): void {
  cache.clear();
}

/**
 * Loudness normalisation (plan §11.7): the server's per-item gain, attenuate only — a player
 * cannot amplify past full volume, and boosting a quiet master would clip anyway.
 */
export function gainToVolume(gainDb: number | undefined): number {
  if (typeof gainDb !== 'number' || !Number.isFinite(gainDb)) return 1;
  return Math.min(1, 10 ** (gainDb / 20));
}
