export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '0:00';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** "1 hr 5 min left", "12 min left", "Less than a minute left". */
export function formatTimeLeft(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return 'Less than a minute left';
  const totalMin = Math.round(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min left`;
  return m === 0 ? `${h} hr left` : `${h} hr ${m} min left`;
}

/** "1 hr 5 min", "12 min": the length of a list, as a playlist header shows it. */
export function formatTotal(seconds: number): string {
  const totalMin = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** "now", "5 min", "3 h", "2 d", "6 w": how long ago, as friend activity shows it. */
export function formatAgo(epochMs: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - epochMs) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return `${Math.floor(days / 7)} w`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function greetingPeriod(date = new Date()): GreetingPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

export function greetingLabel(period: string | undefined): string {
  if (period === 'morning') return 'Good morning';
  if (period === 'afternoon') return 'Good afternoon';
  return 'Good evening';
}

/** The server's sentence when it gave one; otherwise say the server could not be reached. */
export function describeError(err: unknown): string {
  const e = err as { status?: number; message?: string } | null;
  return e?.status && e.message ? e.message : 'Could not reach AdventWave. Check your connection and try again.';
}

/** Initials for a listener's avatar: listeners have a display name and no picture. */
export function initials(name: string | undefined): string {
  return (
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => [...part][0].toUpperCase())
      .join('') || '?'
  );
}

/** Same name, same colour, on every device; the web app uses the same hash. */
export function nameHue(name: string | undefined): number {
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  return Math.abs(hash) % 360;
}

/**
 * Discover categories carry the web's Tailwind gradient (`from-[#6D5DF6]/25 to-[#c9a227]/20`);
 * the colours in it are all a native gradient needs.
 */
export function gradientColors(gradient: string | undefined, fallback: [string, string]): [string, string] {
  const hexes = (gradient ?? '').match(/#[0-9a-f]{6}/gi);
  if (!hexes || hexes.length === 0) return fallback;
  return [hexes[0], hexes[1] ?? fallback[1]];
}

export function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (b: Uint8Array) => Uint8Array } })
    .crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
