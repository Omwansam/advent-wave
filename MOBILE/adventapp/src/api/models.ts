import type { PlaylistDto, TrackDto } from './types';

/**
 * The generated DTOs mark every field optional, because the contract does. These are the
 * shapes the app relies on once an item has come back from the server: an id and a title
 * are always there. Narrow with `asTracks` at the edge instead of sprinkling `!` around.
 */
export type Track = TrackDto & {
  id: string;
  title: string;
  /** Appended by autoplay rather than chosen; the queue says so. Never sent to the server. */
  autoplay?: boolean;
};

export type Playlist = PlaylistDto & { id: string; title: string; songs?: Track[] };

export type MediaType = NonNullable<TrackDto['mediaType']>;

export function asTracks(list: TrackDto[] | null | undefined): Track[] {
  return (list ?? []).filter((t): t is Track => Boolean(t?.id)).map((t) => ({ ...t, title: t.title ?? 'Untitled' }));
}

export function asPlaylists(list: PlaylistDto[] | null | undefined): Playlist[] {
  return (list ?? [])
    .filter((p): p is Playlist => Boolean(p?.id))
    .map((p) => ({ ...p, title: p.title ?? 'Playlist', songs: asTracks(p.songs) }));
}
