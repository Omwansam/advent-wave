/**
 * One function per listener operation in contracts/openapi/adventwave.yaml, the same set the
 * web app's src/api/index.js calls. This module is the only place in the app that knows a URL.
 */
import { http } from './client';
import type {
  AlbumDto,
  ArtistDto,
  AutoplayDto,
  BrowseDto,
  ChaptersDto,
  DiscoverDto,
  FollowResultDto,
  FriendsDto,
  HistoryDto,
  HomeDto,
  LibraryDto,
  LikeResultDto,
  ListenerSessionDto,
  ListeningProgressListDto,
  LyricsDto,
  PlayerStateDto,
  PlaylistDto,
  PlaylistsDto,
  RecommendationsDto,
  SearchResultsDto,
  StreamManifestDto,
  TrackDto,
  UserDto,
  UserProfileDto,
  UserSearchDto,
  UserSettingsDto,
} from './types';

export { ApiError, onUnauthorized, setAuthToken } from './client';

type Opts = { signal?: AbortSignal };

/* -------------------------------------------------------------- auth (RFC 0005) */

export function register(body: { email: string; password: string; name?: string }) {
  return http.post<ListenerSessionDto>('/v1/auth/register', body, { auth: false });
}

export function login(email: string, password: string) {
  return http.post<ListenerSessionDto>('/v1/auth/login', { email, password }, { auth: false });
}

/** 202 whether or not the email has an account. */
export function requestPasswordReset(email: string) {
  return http.post<null>('/v1/auth/password-reset', { email }, { auth: false });
}

export function confirmPasswordReset(token: string, newPassword: string) {
  return http.post<ListenerSessionDto>('/v1/auth/password-reset/confirm', { token, newPassword }, { auth: false });
}

/** Ends every session, this one too, and returns a fresh one. */
export function changePassword(currentPassword: string, newPassword: string) {
  return http.post<ListenerSessionDto>('/v1/me/password', { currentPassword, newPassword });
}

export function signOutEverywhere() {
  return http.post<null>('/v1/me/sign-out');
}

export function resendVerification() {
  return http.post<null>('/v1/me/verify-email');
}

/* -------------------------------------------------------------- me */

export function getMe(options?: Opts) {
  return http.get<UserDto>('/v1/me', options);
}

export function getSettings(options?: Opts) {
  return http.get<UserSettingsDto>('/v1/settings', options);
}

export function updateSettings(settings: UserSettingsDto) {
  return http.put<UserSettingsDto>('/v1/settings', settings);
}

/* -------------------------------------------------------------- catalogue */

export function getHome(options?: Opts) {
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = undefined;
  }
  return http.get<HomeDto>('/v1/home', { ...options, query: { tz } });
}

export function getDiscover(cat: string, options?: Opts) {
  return http.get<DiscoverDto>('/v1/discover', { ...options, query: { cat } });
}

export function getBrowse(options?: Opts) {
  return http.get<BrowseDto>('/v1/browse', options);
}

export function getMedia(id: string, options?: Opts) {
  return http.get<TrackDto>(`/v1/media/${encodeURIComponent(id)}`, options);
}

/** Many ids in one request, in the order given; capped at 200 server-side. */
export function getMediaBatch(ids: string[], options?: Opts): Promise<TrackDto[]> {
  const list = [...new Set(ids.filter(Boolean))].slice(0, 200);
  if (!list.length) return Promise.resolve([]);
  return http.get<TrackDto[]>('/v1/media', { ...options, query: { ids: list.join(',') } });
}

export function getArtist(id: string, options?: Opts) {
  return http.get<ArtistDto>(`/v1/artists/${encodeURIComponent(id)}`, options);
}

export function getAlbum(id: string, options?: Opts) {
  return http.get<AlbumDto>(`/v1/albums/${encodeURIComponent(id)}`, options);
}

/**
 * The playback manifest: loudness, the profile ladder, and one signed URL for the selected
 * profile. The URL expires (`expiresAtEpochSeconds`), so it is never kept past that.
 */
export function getStreamManifest(id: string, options?: Opts) {
  return http.get<StreamManifestDto>(`/v1/media/${encodeURIComponent(id)}/stream`, options);
}

/* -------------------------------------------------------------- search */

export function search(q: string, options?: Opts) {
  return http.get<SearchResultsDto>('/v1/search', { ...options, query: { q } });
}

/* -------------------------------------------------------------- library */

export function getLibrary(options?: Opts) {
  return http.get<LibraryDto>('/v1/library', options);
}

/** One toggle for songs and sermons both: the server files it by the item's media type. */
export function toggleLike(mediaItemId: string) {
  return http.put<LikeResultDto>(`/v1/library/likes/${encodeURIComponent(mediaItemId)}`);
}

export function toggleFollowArtist(artistId: string) {
  return http.put<FollowResultDto>(`/v1/library/follows/artist/${encodeURIComponent(artistId)}`);
}

export function toggleFollowPlaylist(playlistId: string) {
  return http.put<FollowResultDto>(`/v1/library/follows/playlist/${encodeURIComponent(playlistId)}`);
}

export function getHistory(options?: Opts) {
  return http.get<HistoryDto>('/v1/history', options);
}

export function clearHistory() {
  return http.del<null>('/v1/history');
}

/* -------------------------------------------------------------- friends (RFC 0007) */

/** Listeners by display name: 2–100 characters, the caller excluded. */
export function searchUsers(q: string, options?: Opts & { limit?: number }) {
  return http.get<UserSearchDto>('/v1/users', { signal: options?.signal, query: { q, limit: options?.limit ?? 20 } });
}

/** A listener's public profile: name, counts, and who follows whom. Never an email. */
export function getUserProfile(id: string, options?: Opts) {
  return http.get<UserProfileDto>(`/v1/users/${encodeURIComponent(id)}`, options);
}

export function toggleFollowUser(userId: string) {
  return http.put<FollowResultDto>(`/v1/library/follows/user/${encodeURIComponent(userId)}`);
}

/** Everyone the caller follows, with what each last played when they share it. */
export function getFriends(options?: Opts) {
  return http.get<FriendsDto>('/v1/friends', options);
}

/* -------------------------------------------------------------- playlists */

/** Curated playlists plus the caller's own, with tracks resolved. */
export function getPlaylists(options?: Opts) {
  return http.get<PlaylistsDto>('/v1/playlists', options);
}

export function getPlaylist(id: string, options?: Opts) {
  return http.get<PlaylistDto>(`/v1/playlists/${encodeURIComponent(id)}`, options);
}

export function createPlaylist(body: { title: string; description?: string }) {
  return http.post<PlaylistDto>('/v1/playlists', body);
}

export function addPlaylistItems(id: string, mediaItemIds: string[]) {
  return http.put<PlaylistDto>(`/v1/playlists/${encodeURIComponent(id)}/items`, { mediaItemIds });
}

export function removePlaylistItem(id: string, mediaItemId: string) {
  return http.del<PlaylistDto>(`/v1/playlists/${encodeURIComponent(id)}/items/${encodeURIComponent(mediaItemId)}`);
}

export function updatePlaylist(id: string, body: { title?: string; description?: string }) {
  return http.patch<PlaylistDto>(`/v1/playlists/${encodeURIComponent(id)}`, body);
}

export function deletePlaylist(id: string) {
  return http.del<null>(`/v1/playlists/${encodeURIComponent(id)}`);
}

/* -------------------------------------------------------------- player state */

export interface PlayerSnapshot {
  currentSongId: string | null;
  queue: string[];
  orderedQueue: string[] | null;
  currentIndex: number;
  positionMs: number;
  volume: number;
  shuffle: boolean;
  repeat: string;
}

export function getPlayerState(options?: Opts) {
  return http.get<PlayerStateDto | null>('/v1/player-state', options);
}

export function savePlayerState(state: PlayerSnapshot) {
  return http.put<null>('/v1/player-state', state);
}

/* -------------------------------------------------------------- listening progress (RFC 0003) */

export function getProgress(options?: Opts) {
  return http.get<ListeningProgressListDto>('/v1/progress', options);
}

/** The server refuses songs (400) and unpublished items (404). */
export function saveProgress(mediaItemId: string, body: { positionMs: number; completed: boolean }) {
  return http.put<null>(`/v1/progress/${encodeURIComponent(mediaItemId)}`, body);
}

/* -------------------------------------------------------------- lyrics, chapters, autoplay (RFC 0004) */

/** 404 means the song has none: callers treat that as empty, not as an error. */
export function getLyrics(mediaItemId: string, options?: Opts) {
  return http.get<LyricsDto>(`/v1/media/${encodeURIComponent(mediaItemId)}/lyrics`, options);
}

export function getChapters(mediaItemId: string, options?: Opts) {
  return http.get<ChaptersDto>(`/v1/media/${encodeURIComponent(mediaItemId)}/chapters`, options);
}

/** What to play when the queue runs out, most like the seeds first (1–10 seeds). */
export function getAutoplay(seedIds: string[], limit = 10) {
  return http.get<AutoplayDto>('/v1/autoplay', { query: { seed: seedIds.join(','), limit } });
}

export function getRecommendations(options?: Opts) {
  return http.get<RecommendationsDto>('/v1/recommendations', options);
}

/* -------------------------------------------------------------- events */

export interface PlaybackEventBody {
  eventId: string;
  mediaItemId: string;
  sessionId: string;
  eventType: 'play_started' | 'play_completed' | 'skipped';
  msPlayed: number;
  device: string;
  clientTs: string;
}

/**
 * Playback telemetry. The server decides what counts as a play and honours private session;
 * the client only says what happened.
 */
export function sendPlaybackEvent(event: PlaybackEventBody) {
  return http.post<null>('/v1/events/playback', event);
}
