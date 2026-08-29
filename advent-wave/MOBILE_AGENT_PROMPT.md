# AdventWave Mobile App — Agent Prompt

Build the complete **AdventWave** mobile app in the existing Expo + React Native + NativeWind project. The app must be **feature-parity with the web app** at:

`/storage/Development/Cassava/Sabbath/advent-wave`

Use that web codebase as the **single source of truth** for business logic, data, UX copy, screen content, and behavior. Port it faithfully to mobile — same screens, same mock data, same Zustand store logic, same design language — adapted for native/mobile patterns.

**Working directory (mobile scaffold):**

`/storage/Development/Cassava/SabatoApp/advent-app/advent`

The scaffold already has Expo 56, Expo Router, NativeWind v4, and a placeholder `src/app/index.tsx`. Replace the placeholder and build out the full app.

---

## Product Summary

**AdventWave** is a faith-centered Spotify-style streaming app for:

- Worship music & hymns
- Sermons
- Podcasts

It uses **mock catalogue data** (no real backend), **mock auth**, and a **global music player** with queue, shuffle, repeat, likes, playlists, recommendations, search, and listening history — all persisted locally.

Tagline: *"Worship, sermons & podcasts"*

---

## Tech Stack (use these — do not swap)

| Layer | Choice |
|-------|--------|
| Framework | React Native 0.85 + Expo ~56 |
| Routing | **expo-router** (file-based, `src/app/`) |
| Styling | **NativeWind v4** + Tailwind CSS 3 |
| State | **zustand** + `persist` middleware |
| Persistence | `@react-native-async-storage/async-storage` (Zustand storage adapter) |
| Audio | **expo-av** (`Audio.Sound`) — replaces web `<audio>` |
| Images | `expo-image` |
| Icons | `lucide-react-native` (web uses `lucide-react`) |
| Fonts | Load **DM Sans** via `expo-font` (web uses Google Fonts) |
| Gestures / animation | `react-native-gesture-handler`, `react-native-reanimated` (already installed) |
| Safe areas | `react-native-safe-area-context` |

### Install missing deps

```bash
npx expo install zustand @react-native-async-storage/async-storage expo-av lucide-react-native
```

---

## Design System (match web exactly)

Port CSS variables from `advent-wave/src/index.css` into a theme file (e.g. `src/constants/theme.ts`) and use them in NativeWind via `tailwind.config.js` `extend.colors` or inline `style` where needed.

### Light theme tokens

- Primary: `#6d5df6` (hover: `#5a4ae8`)
- Gold accent: `#c9a227`
- Gold soft: `#f5f0d8`
- Background: `#f7f7f9`
- Surface: `#ffffff`
- Surface elevated: `#f0f0f4`
- Text: `#2d2a35`
- Muted: `#6b6578`
- Border: `#e8e7ed`

### Dark theme tokens

- Background: `#121118`
- Surface: `#1a1824`
- Surface elevated: `#232030`
- Text: `#eceaf2`
- Muted: `#9b95ad`
- Border: `#2e2c3a`
- Gold soft: `#3d3520`

### Visual language

- Rounded cards (`rounded-2xl` / `rounded-3xl`)
- Purple gradient logo badge (`from #6d5df6 to #8b7cff`)
- Radial gradient hero backgrounds (purple + gold)
- Card shadows with purple tint
- DM Sans font family
- Splash screen: Sparkles icon, "AdventWave", animated loading dots (2.2s, then navigate)

Support **light/dark theme toggle** persisted in UI store (mirror web `useUiStore.theme`).

---

## Target Folder Structure

Build this inside `src/`:

```
src/
  app/
    _layout.tsx                 # Root: providers, splash, auth gate, theme
    login.tsx                   # Login screen
    (tabs)/
      _layout.tsx               # Bottom tab navigator
      index.tsx                 # Home
      search.tsx                # Search (with ?q= param)
      browse.tsx                # Browse hub
      library.tsx               # Library
    discover.tsx                # Discover (with ?cat= param)
    settings.tsx
    history.tsx                 # Listening history
    artists.tsx                 # Followed artists
    liked.tsx                   # Liked songs
    podcasts.tsx
    sermons.tsx
    album/[id].tsx
    artist/[name].tsx           # URL-encoded artist name
    playlist/[id].tsx
    global.css                  # NativeWind entry (already exists)

  components/
    SplashScreen.tsx
    MiniPlayer.tsx              # Bottom bar player (web: MusicPlayer)
    FullPlayerModal.tsx         # Full-screen now playing
    QueueDrawer.tsx             # Bottom sheet or slide-over queue
    SongRow.tsx
    PlaylistCard.tsx
    SectionRow.tsx              # Horizontal scroll section header
    LikeButton.tsx
    SearchBar.tsx
    SearchHighlight.tsx
    CreatePlaylistModal.tsx
    ConnectDeviceModal.tsx      # Mock UI
    ToastHost.tsx
    FriendActivityPanel.tsx     # Optional: collapsible side panel or separate sheet
    WhatsNewMenu.tsx
    PageSkeleton.tsx
    RequireAuth.tsx             # Auth wrapper HOC or hook

  data/
    mockData.ts                 # COPY from web (convert .js → .ts)
    mockAuth.ts
    recommendationMeta.ts

  store/
    useAuthStore.ts
    usePlayerStore.ts
    useLibraryStore.ts
    useUiStore.ts
    useToastStore.ts
    storage.ts                  # AsyncStorage adapter for zustand persist

  utils/
    format.ts
    timeGreeting.ts
    getRecommendations.ts
    searchRank.ts

  hooks/
    useAudioPlayer.ts           # expo-av bridge to usePlayerStore

  constants/
    theme.ts
```

### Fix existing config issues

1. Update `tailwind.config.js` `content` to include:
   `"./src/**/*.{js,jsx,ts,tsx}"`
2. Fix `metro.config.js` NativeWind input path to:
   `input: './src/app/global.css'` (currently points to wrong `./app/global.css`)
3. Update `app.json` splash `backgroundColor` to `#6d5df6` (brand purple, not default blue)

---

## Web Reference — Routes to Implement

Mirror `advent-wave/src/App.jsx` routing:

| Route | Screen | Notes |
|-------|--------|-------|
| `/login` | LoginPage | Mock auth; redirect if logged in |
| `/` | Home | Personalized hero, horizontal sections |
| `/search` | SearchResults | Tabs: All, Songs, Artists, Albums, Playlists, Sermons, Podcasts; `?q=` query |
| `/browse` | Browse | Categories, new releases, album grid |
| `/discover` | Discover | Category chips; `?cat=` filter |
| `/library` | Library | User + curated playlists, liked preview |
| `/liked` | LikedSongs | Full liked songs list |
| `/history` | ListeningHistory | Recent plays with timestamps |
| `/artists` | FollowedArtists | Artists user follows |
| `/settings` | Settings | Theme, playback prefs, private session, logout |
| `/podcasts` | Podcasts | Episode list |
| `/sermons` | Sermons | Sermon list + save/bookmark |
| `/album/:id` | AlbumDetail | Album header + track list |
| `/artist/:name` | ArtistDetail | Artist page + follow |
| `/playlist/:id` | PlaylistDetail | Play, shuffle, edit/delete user playlists |

**Auth flow:** Splash (2.2s) → if not authed → `/login` → else main app.

Wrap all routes except `/login` in auth guard (web: `RequireAuth`).

---

## Mobile Navigation Pattern

Web uses sidebar + top navbar. Mobile should use:

### Bottom tabs (primary — 4 tabs)

1. **Home** → `(tabs)/index`
2. **Search** → `(tabs)/search`
3. **Browse** → `(tabs)/browse`
4. **Library** → `(tabs)/library`

### Stack screens (push from tabs or menus)

Discover, Settings, History, Artists, Liked, Podcasts, Sermons, Album, Artist, Playlist

### Global chrome (always visible when authed + track playing)

- **Mini player** fixed above tab bar (web: `MusicPlayer` bottom bar)
- Tap mini player → **FullPlayerModal** (web: full-screen modal)
- Queue button → **QueueDrawer** (bottom sheet)
- **ToastHost** overlay for actions ("Added to queue", etc.)

### Secondary nav access

Add a **header menu** or **Library sub-links** for: Discover, Podcasts, Sermons, History, Followed Artists, Liked Songs, Settings — matching web sidebar items from `Sidebar.jsx`:

```
Home, Search, Browse, Discover, Library, Liked songs,
Listening history, Your artists, Podcasts, Sermons, Settings
```

Skip web-only features or adapt:

- `KeyboardShortcutsModal` → omit or show as "Tips" sheet in Settings
- `Sidebar` collapse → N/A on mobile
- `FriendActivityPanel` → implement as optional right-edge collapsible panel OR a "Friends listening" section in Home/Settings

---

## State Management — Port Verbatim from Web

Copy logic from these files (convert JS → TS, swap `localStorage` persist → AsyncStorage):

### `useAuthStore`

- `user: { name, email } | null`
- `login(email, name)`, `logout()`
- Persist key: `adventwave-auth`

### `usePlayerStore` (critical — full queue engine)

Port entire file from `advent-wave/src/store/usePlayerStore.js`:

- `currentSong`, `isPlaying`, `queue`, `orderedQueue`, `currentIndex`
- `volume`, `currentTime`, `duration`
- `shuffle`, `repeat` (`'off' | 'all' | 'one'`)
- `queuePanelOpen`
- Actions: `playSong`, `playQueue`, `togglePlay`, `nextSong`, `prevSong`, `seek`, `toggleShuffle`, `cycleRepeat`, `addToQueue`, `enqueueSongs`, `playNext`, `removeFromQueue`, `jumpToQueueIndex`, etc.
- Persist: `volume`, `shuffle`, `repeat`

### `useLibraryStore`

Port from `useLibraryStore.js`:

- `likedSongIds`, `savedSermonIds`, `userPlaylists`, `followedArtistNames`, `followedPlaylistIds`
- `recentHistory: { id, ts }[]`, `recentTrackIds`
- Actions: `toggleLike`, `toggleLikePlaylistTracks`, `toggleFollowArtist`, `toggleFollowPlaylist`, `toggleSavedSermon`, `recordTrackPlay`, `clearRecentHistory`, `createPlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`, `updateUserPlaylist`, `deleteUserPlaylist`

### `useUiStore`

Port from `useUiStore.js` (skip `sidebarCollapsed` or ignore on mobile):

- `theme`, `fullPlayerOpen`, `connectDeviceOpen`, `createPlaylistOpen`, `createPlaylistSeed`
- `privateSession`, `friendActivityCollapsed`
- `normalizeAudio`, `crossfadeEnabled`, `crossfadeSec` (mock toggles)

### `useToastStore`

- `showToast(message)` auto-hide ~2.6s

---

## Data Layer — Copy from Web

Copy these files from `advent-wave/src/data/` and `advent-wave/src/utils/`:

### `mockData` exports (must include all)

- `songs` (30 worship tracks incl. Kenya catalogue)
- `kenyaSongIds`, `playlists`, `discoverCategories`
- `podcastEpisodes`, `sermonTracks`, `trendingChoirs`
- `recentlyPlayedIds`
- Helpers: `getSongById`, `getSongsByIds`, `resolvePlaylist`, `getPlaylistById`, `getAllAlbums`, `getAlbumById`, `getAlbumForSong`, `getAllArtists`, `getArtistByName`, `searchCatalogFull`, `searchCatalog`

### `mockAuth`

```ts
export const MOCK_LOGIN = {
  email: 'listener@adventwave.app',
  password: 'demo1234',
}
```

### `recommendationMeta` + `getRecommendations`

Used on Home for "Recommended for you", trending by region, etc.

### `searchRank` + `SearchHighlight`

Used in search results ranking and highlight.

### `timeGreeting` + `formatDuration`

Home hero: "Good morning, {firstName}"

**Song shape:**

```ts
{ id, title, artist, album, duration, cover, audioUrl }
```

Audio URLs use SoundHelix MP3 placeholders — keep as-is for demo.

---

## Screen-by-Screen Requirements

### SplashScreen (`SPLASH_MS = 2200`)

Match `components/SplashScreen.jsx`: purple gradient bg, Sparkles logo, "AdventWave", subtitle, animated dots.

### LoginPage

Match `pages/LoginPage.jsx`:

- Email + password form
- Mock login box with prefilled credentials
- Validation: valid email, password ≥ 4 chars
- 400ms fake submit delay
- "Continue with Google" disabled (soon)
- On success → Home

### Home

Match `pages/Home.jsx` sections exactly:

1. Hero with time greeting + "Play featured mix" (plays all `songs`)
2. Recently played (from `recentTrackIds` or fallback `recentlyPlayedIds`)
3. Recommended for you (songs + playlist cards via `getRecommendations`)
4. Trending now (popularity-sorted)
5. From artists you follow (or empty state CTA)
6. Sabbath worship picks (keyword-scored playlists)
7. Sermons for you (saved first)

Use horizontal `ScrollView` for each `SectionRow` (web uses horizontal scroll cards).

### Search / SearchResults

Match `pages/SearchResults.jsx`:

- Tab filters
- Top result card (song/sermon/podcast/artist/album/playlist)
- Grouped results with play actions
- `SearchHighlight` for query matches
- Kenya query boost from `searchRank`

### Browse

Match `pages/Browse.jsx`: hero, category grid, new on AdventWave albums, links to Discover/Library.

### Discover

Match `pages/Discover.jsx`: category chips (`worship`, `youth`, `instrumental`, `choirs`, `churches`, `kenya`), filtered song grid.

### Library

Match `pages/Library.jsx`: playlist sort (recent/alpha), liked songs preview, curated + user playlists grid.

### LikedSongs, ListeningHistory, FollowedArtists

Port respective page files — sort options, empty states, navigation to artist/album.

### AlbumDetail, ArtistDetail, PlaylistDetail

Port detail pages with:

- Hero cover art, play/shuffle buttons
- Follow artist / follow playlist toggles
- User playlist edit/delete (if `id` starts with `u-`)
- Song rows with context menus (add to playlist, add to queue, play next)

### Podcasts & Sermons

Port pages. Sermons have bookmark/save toggle (`toggleSavedSermon`).

### Settings

Match `pages/Settings.jsx` sections:

- Appearance (theme toggle)
- Playback (streaming quality info, normalize volume toggle, crossfade toggle + seconds slider)
- Social (private session toggle — hides friend activity)
- Account (profile info, logout)
- About links (demo)

---

## Audio Player Implementation (expo-av)

Create `hooks/useAudioPlayer.ts` that:

1. Loads `Audio.Sound` when `currentSong` changes
2. Syncs `isPlaying` → `sound.playAsync()` / `pauseAsync()`
3. Updates `currentTime` on playback status (interval or `setOnPlaybackStatusUpdate`)
4. Sets `duration` from status
5. On track end: respect `repeat === 'one'` (replay) else call `nextSong()`
6. `seek(seconds)` → `setPositionAsync`
7. `volume` → `setVolumeAsync`
8. On `currentSong.id` change → `recordTrackPlay(songId)` via library store
9. `prevSong` behavior: if `currentTime > 3s`, restart track; else previous track

Wire MiniPlayer + FullPlayerModal to same audio hook (pass sound ref or centralize in provider).

---

## Key Components to Port

| Web component | Mobile component | Notes |
|---------------|------------------|-------|
| `MusicPlayer.jsx` | `MiniPlayer.tsx` | Bottom bar above tabs; show cover, title, artist, play/pause, like, queue, expand |
| `FullPlayerModal.jsx` | `FullPlayerModal.tsx` | Full screen modal; progress scrubber; shuffle/repeat; album link |
| `QueueDrawer.jsx` | `QueueDrawer.tsx` | Bottom sheet with reorder/remove (remove optional) |
| `SongRow.jsx` | `SongRow.tsx` | Press to play; long-press or ⋮ menu for actions |
| `PlaylistCard.jsx` | `PlaylistCard.tsx` | Navigate to playlist |
| `SectionRow.jsx` | `SectionRow.tsx` | Title + "See all" link |
| `LikeButton.jsx` | `LikeButton.tsx` | Heart toggle with pop animation |
| `CreatePlaylistModal.jsx` | `CreatePlaylistModal.tsx` | Modal form → `createPlaylist` |
| `ConnectDeviceModal.jsx` | `ConnectDeviceModal.tsx` | Mock device list |
| `ToastHost.jsx` | `ToastHost.tsx` | Animated toast at bottom |
| `SearchBar.jsx` | `SearchBar.tsx` | `TextInput` with search icon |
| `Navbar.jsx` | Tab headers + stack headers | Search, cast, theme toggle, profile |
| `WhatsNewMenu.jsx` | `WhatsNewMenu.tsx` | Changelog dropdown/sheet |

---

## Root Layout Structure

```tsx
// src/app/_layout.tsx (conceptual)
- Load fonts (DM Sans)
- Wrap: SafeAreaProvider, GestureHandlerRootView
- ThemeProvider (light/dark from useUiStore)
- SplashScreen overlay for 2.2s on cold start
- Stack:
    - login (no player)
    - (tabs) (with MiniPlayer + ToastHost overlay)
    - modal screens: discover, settings, history, etc.
    - FullPlayerModal as transparent modal route OR in-layout modal
```

Use `expo-router` `Stack` + `Tabs`. Keep mini player **outside** individual screens but inside root layout so it persists across navigation.

---

## Acceptance Criteria

The mobile app is **done** when:

- [ ] All 16+ screens/routes listed above are implemented and navigable
- [ ] Mock login works with `listener@adventwave.app` / `demo1234`
- [ ] Global player plays audio from mock URLs with play/pause/seek/next/prev
- [ ] Shuffle and repeat (off/all/one) work correctly
- [ ] Queue panel shows current queue; add/remove/play-next work
- [ ] Like songs, save sermons, follow artists/playlists persist across app restarts
- [ ] User can create/edit/delete custom playlists
- [ ] Search with tabs returns ranked results matching web behavior
- [ ] Home recommendations and sections match web logic
- [ ] Light/dark theme toggle works and persists
- [ ] Visual design matches web (purple/gold, rounded cards, gradients, DM Sans)
- [ ] App runs with `npx expo start` on iOS/Android without errors
- [ ] No web-only APIs (`document`, `window`, `localStorage`, `<audio>`, `react-router-dom`)

---

## Implementation Order (recommended)

1. Fix NativeWind/Metro/Tailwind config + theme constants
2. Copy `data/`, `utils/`, `store/` (with AsyncStorage persist)
3. Build `useAudioPlayer` + `MiniPlayer` + `FullPlayerModal`
4. Auth flow: Splash → Login → Tabs
5. Home screen (proves player + sections work)
6. Library, Liked, Playlist detail, Create playlist
7. Search + Browse + Discover
8. Album, Artist, History, Followed artists
9. Podcasts, Sermons, Settings
10. Polish: toasts, modals, friend activity, skeletons, empty states

---

## Constraints

- **Do not** add a real backend or change mock data semantics
- **Do not** simplify store logic — port it faithfully
- **Do not** use `react-router-dom` — use `expo-router` (`Link`, `useRouter`, `useLocalSearchParams`)
- **Do not** use HTML elements — use RN primitives (`View`, `Text`, `Pressable`, `ScrollView`, `FlatList`, `TextInput`, `Modal`)
- **Do not** rewrite copy/text — keep the same headings, subtitles, and button labels as web
- **Minimize scope creep** — no real Google auth, no real CDN, no push notifications unless trivial

---

## Reference File Index (web source of truth)

```
advent-wave/src/
  App.jsx                          # Routes
  index.css                        # Design tokens
  layouts/AppLayout.jsx            # Shell pattern
  pages/                           # All screens
  components/                      # All UI components
  store/                           # All Zustand stores
  data/mockData.js, mockAuth.js, recommendationMeta.js
  utils/format.js, timeGreeting.js, getRecommendations.js, searchRank.js
```

Read each corresponding web file before implementing its mobile equivalent. When in doubt, match web behavior exactly.

---

## Project Paths

| Project | Path |
|---------|------|
| Web app (source of truth) | `/storage/Development/Cassava/Sabbath/advent-wave` |
| Mobile scaffold (build here) | `/storage/Development/Cassava/SabatoApp/advent-app/advent` |
