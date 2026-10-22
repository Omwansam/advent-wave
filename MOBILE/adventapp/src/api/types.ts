// GENERATED from contracts/openapi/adventwave.yaml (contracts 1.6.0). Do not edit by hand:
// regenerate when the contract changes. Only the listener-facing schemas are kept.

export interface AccountCreateRequest {
  displayName: string
  email: string
  role: string
  temporaryPassword: string
}

export interface AccountUpdateRequest {
  active?: boolean
  displayName?: string
  role?: string
}

export interface Activity {
  atEpochMs?: number
  mediaItemId?: string
  playing?: boolean
}

export interface AlbumDto {
  artist?: string
  artistId?: string
  cover?: string
  id?: string
  songIds?: string[]
  title?: string
  tracks?: TrackDto[]
}

export interface ArtistDto {
  cover?: string
  id?: string
  name?: string
  slug?: string
  songIds?: string[]
  tracks?: TrackDto[]
  verified?: boolean
}

export interface Asset {
  bitrateKbps?: number
  byteSize?: number
  channels?: number
  checksumSha256?: string
  codec?: string
  container?: string
  profile?: string
  sampleRateHz?: number
  storageKey?: string
}

export interface AutoplayDto {
  tracks?: TrackDto[]
}

export interface BecauseYouListened {
  artistName?: string
  songs?: TrackDto[]
}

export interface BrowseDto {
  categories?: DiscoverCategoryDto[]
  podcasts?: TrackDto[]
  sermons?: TrackDto[]
  songs?: TrackDto[]
}

export interface ChapterDto {
  startMs?: number
  title: string
}

export interface ChaptersDto {
  chapters?: ChapterDto[]
  mediaItemId?: string
}

export interface ChaptersUpdateDto {
  chapters: ChapterDto[]
}

export interface ConsentRequest {
  consentStatus: string
}

export interface CreateRequest {
  cover?: string
  description?: string
  title?: string
}

export interface DiscoverCategoryDto {
  cover?: string
  gradient?: string
  id?: string
  label?: string
  sortOrder?: number
}

export interface DiscoverDto {
  categories?: DiscoverCategoryDto[]
  tracks?: TrackDto[]
}

export interface Error {
  error: string
  message: string
  status: number
  timestamp: string
}

export interface FollowResultDto {
  following?: boolean
}

export interface Friend {
  activity?: Activity
  displayName?: string
  id?: string
}

export interface FriendsDto {
  friends?: Friend[]
  tracks?: TrackDto[]
}

export interface HistoryDto {
  entries?: HistoryEntry[]
  tracks?: TrackDto[]
}

export interface HistoryEntry {
  id?: string
  ts?: number
}

export interface HomeDto {
  greetingPeriod?: string
  recentlyPlayed?: TrackDto[]
  recommendations?: RecommendationsDto
  sabbathWorship?: PlaylistDto[]
  sermons?: TrackDto[]
  trendingNow?: TrackDto[]
}

export interface ItemsRequest {
  mediaItemIds: string[]
}

export interface LibraryDto {
  followedArtistIds?: string[]
  followedArtistNames?: string[]
  followedPlaylistIds?: string[]
  likedSongIds?: string[]
  recentHistory?: HistoryEntry[]
  recentTrackIds?: string[]
  savedSermonIds?: string[]
  userPlaylists?: PlaylistDto[]
}

export interface LikeResultDto {
  liked?: boolean
}

export interface ListenerEmailVerification {
  token: string
}

export interface ListenerLoginRequest {
  email: string
  password: string
}

export interface ListenerPasswordChange {
  currentPassword: string
  newPassword: string
}

export interface ListenerPasswordResetConfirm {
  newPassword: string
  token: string
}

export interface ListenerPasswordResetRequest {
  email: string
}

export interface ListenerRegisterRequest {
  email: string
  name?: string
  password: string
}

export interface ListenerSessionDto {
  expiresIn?: number
  token?: string
  tokenType?: string
  user?: UserDto
}

export interface ListeningProgressDto {
  completed?: boolean
  mediaItemId?: string
  positionMs?: number
  updatedAt?: string
}

export interface ListeningProgressListDto {
  items?: ListeningProgressDto[]
}

export interface LyricLineDto {
  startMs?: number
  text: string
}

export interface LyricsDto {
  credit?: string
  language?: string
  lines?: LyricLineDto[]
  mediaItemId?: string
  rightsBasis?: string
  synced?: boolean
  updatedAt?: string
}

export interface LyricsMatchDto {
  line?: string
  track?: TrackDto
}

export interface LyricsUpdateDto {
  credit: string
  language?: string
  lines: LyricLineDto[]
  rightsBasis: string
}

export interface MasterUploadDto {
  expiresAt?: string
  masterStorageKey?: string
  method?: string
  uploadUrl?: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
}

export interface PasswordResetRequest {
  temporaryPassword: string
}

export interface PlaybackEvent {
  client_ts?: string
  counted?: boolean
  device?: string
  duration_ms?: number
  event_id?: string
  event_type?: string
  media_item_id?: string
  media_type?: 'song' | 'sermon' | 'podcast'
  ms_played?: number
  private?: boolean
  server_ts?: string
  session_id?: string
  user_id?: string
}

export interface PlaybackSubmission {
  clientTs?: string
  device?: string
  eventId?: string
  eventType: string
  mediaItemId: string
  msPlayed?: number
  sessionId?: string
}

export interface PlayerStateDto {
  currentIndex?: number
  currentSongId?: string
  orderedQueue?: string[]
  positionMs?: number
  queue?: string[]
  repeat?: string
  shuffle?: boolean
  tracks?: TrackDto[]
  updatedAt?: string
  volume?: number
}

export interface PlaylistDto {
  cover?: string
  description?: string
  id?: string
  isCurated?: boolean
  legacyId?: string
  ownerId?: string
  songIds?: string[]
  songs?: TrackDto[]
  title?: string
}

export interface PlaylistsDto {
  curated?: PlaylistDto[]
  mine?: PlaylistDto[]
}

export interface Profile {
  bitrateKbps?: number
  byteSize?: number
  codec?: string
  profile?: string
}

export interface RecommendationsDto {
  becauseYouListened?: BecauseYouListened
  recommendedPlaylists?: PlaylistDto[]
  recommendedSongs?: TrackDto[]
  trendingInRegion?: TrendingInRegion
}

export interface Request {
  contactEmail?: string
  country?: string
  name: string
  region?: string
}

export interface SearchResultsDto {
  albums?: AlbumDto[]
  artists?: ArtistDto[]
  lyricsMatches?: LyricsMatchDto[]
  playlists?: PlaylistDto[]
  podcasts?: TrackDto[]
  sermons?: TrackDto[]
  songs?: TrackDto[]
  topResult?: TopResult
}

export interface SessionRequest {
  email: string
  name?: string
}

export interface SessionResponse {
  expiresIn?: number
  token?: string
  tokenType?: string
  user?: UserDto
}

export interface StatusRequest {
  consentStatus: string
}

export interface StreamManifestDto {
  audioUrl?: string
  durationMs?: number
  expiresAtEpochSeconds?: number
  gainDb?: number
  loudnessLufs?: number
  mediaItemId?: string
  profiles?: Profile[]
  selectedProfile?: string
  targetLufs?: number
  waveformUrl?: string
}

export interface TopResult {
  item?: unknown
  score?: number
  type?: string
}

export interface TrackDto {
  album?: string
  albumId?: string
  artist?: string
  artistId?: string
  audioUrl?: string
  cover?: string
  duration?: number
  durationMs?: number
  genre?: string
  id?: string
  language?: string
  legacyId?: string
  mediaType?: 'song' | 'sermon' | 'podcast'
  popularity?: number
  region?: string
  title?: string
}

export interface TranscodeRequest {
  masterStorageKey: string
}

export interface TrendingInRegion {
  label?: string
  region?: string
  songs?: TrackDto[]
}

export interface Update {
  albumId?: string
  coverUrl?: string
  durationMs?: number
  genre?: string
  language?: string
  licenseId?: string
  popularity?: number
  region?: string
  title?: string
}

export interface UpdateRequest {
  description?: string
  title?: string
}

export interface UploadRequest {
  contentType?: string
  filename: string
  sizeBytes?: number
}

export interface UserDto {
  createdAt?: string
  email?: string
  emailVerified?: boolean
  id?: string
  name?: string
  region?: string
}

export interface UserProfileDto {
  displayName?: string
  followedByMe?: boolean
  followerCount?: number
  followingCount?: number
  followsMe?: boolean
  id?: string
  isMe?: boolean
}

export interface UserSearchDto {
  users?: UserSummaryDto[]
}

export interface UserSettingsDto {
  audioQuality?: string
  autoplay?: boolean
  crossfadeEnabled?: boolean
  crossfadeSec?: number
  friendActivityCollapsed?: boolean
  normalizeAudio?: boolean
  privateSession?: boolean
  shareActivity?: boolean
  sidebarCollapsed?: boolean
  theme?: string
}

export interface UserSummaryDto {
  displayName?: string
  followedByMe?: boolean
  id?: string
}

