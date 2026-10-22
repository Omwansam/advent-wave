import { sendPlaybackEvent } from '@/api';
import type { Track } from '@/api/models';
import { DEVICE } from '@/lib/config';
import { uuid } from '@/lib/format';
import { trackSeconds } from '@/lib/longForm';

/**
 * Reports playback to the server, as the web app's usePlaybackReporter does. The client only
 * says what happened; the server decides whether it counts as a play (≥30 s or ≥50 %), whether
 * private session hides it, and whether it reaches history — a licensing obligation to the
 * contributing churches, so it has one implementation, on the server.
 *
 * Listening time is accumulated from the player's position ticks rather than read at the end,
 * so a seek never counts as time heard.
 */
const SESSION_ID = uuid();
/** A tick further than this from the last one is a seek or a new load, not listening. */
const MAX_TICK_SEC = 2.5;

let current: { track: Track; durationSec: number } | null = null;
let playedMs = 0;
let lastPosition = 0;

function send(mediaItemId: string, eventType: 'play_started' | 'play_completed' | 'skipped', msPlayed: number) {
  sendPlaybackEvent({
    eventId: uuid(),
    mediaItemId,
    sessionId: SESSION_ID,
    eventType,
    msPlayed: Math.round(msPlayed),
    device: DEVICE,
    clientTs: new Date().toISOString(),
  }).catch(() => {
    // Telemetry never breaks playback; the server rate-limits this route.
  });
}

export const reporter = {
  /** The item started producing sound. A resume of the same item is not a new start. */
  started(track: Track, durationSec?: number) {
    if (current?.track.id === track.id) return;
    this.ended();
    current = { track, durationSec: durationSec || trackSeconds(track) };
    playedMs = 0;
    lastPosition = 0;
    send(track.id, 'play_started', 0);
  },

  tick(position: number, playing: boolean) {
    if (!current) return;
    const delta = position - lastPosition;
    if (playing && delta > 0 && delta < MAX_TICK_SEC) playedMs += delta * 1000;
    lastPosition = position;
  },

  seeked(position: number) {
    lastPosition = position;
  },

  setDuration(durationSec: number) {
    if (current && durationSec > 0) current.durationSec = durationSec;
  },

  /** The item is over: changed, ended, or the session closed. Completed means ≥95 % heard. */
  ended() {
    if (!current) return;
    const { track, durationSec } = current;
    current = null;
    if (playedMs <= 0) return;
    const completed = durationSec > 0 && playedMs >= durationSec * 1000 * 0.95;
    send(track.id, completed ? 'play_completed' : 'skipped', playedMs);
    playedMs = 0;
  },
};
