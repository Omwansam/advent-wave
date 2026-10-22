# AdventWave for iOS and Android

The listener app: the same account, library, playlists, queue and sermon progress as the web app
at <https://adventwave.draftbitlabs.tech>, on a phone, with background playback and lock-screen
controls. Expo SDK 58, Expo Router, TypeScript.

It talks to the live gateway by default. Nothing on the server is specific to the app: it calls
the same `/v1` operations as the web client (`contracts/openapi/adventwave.yaml`), and a phone
sends no `Origin`, so the gateway's CORS list does not apply to it.

## Run it

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press a / i for an emulator
```

Expo Go plays audio in the foreground. Background playback and the lock screen need a build of
the app itself (see below), because they come from `expo-audio`'s config plugin.

### Against a local gateway

Put the address in `.env.local` (ignored by git) and restart `npx expo start`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080        # Android emulator → this machine
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8080    # a phone on the same Wi-Fi → this machine
```

The web build (`npx expo start --web`) is a browser page, so its origin must be in the gateway's
`ADVENTWAVE_CORS_ORIGINS`. The live server allows `http://localhost:8081` and
`http://127.0.0.1:8081`; open the web build at one of those, not at the LAN address Expo prints.

## Build it

`eas.json` pins every build to the live gateway.

```bash
npx eas-cli@latest build --profile preview --platform android    # an APK to install directly
npx eas-cli@latest build --profile production --platform all     # store builds
```

App ids: `tech.draftbitlabs.adventwave` on both platforms.

## How it is put together

| Where | What |
|---|---|
| `src/api` | One function per operation (`index.ts`), the fetch wrapper (`client.ts`), types generated from the OpenAPI contract (`types.ts`) |
| `src/store` | zustand stores. The player store holds the queue rules (shuffle, repeat, play next), which are the web app's, so the queue the server keeps reads the same on both |
| `src/playback/engine.ts` | The one thing that makes sound: an expo-audio `AudioPlaylist` that follows the player store. It holds the current item and the next one, so Next and the end of a song hand over without a gap, and the lock screen's Next/Previous move the same queue |
| `src/playback/sync.ts` | Player state saved to the account (`/v1/player-state`), and autoplay when the queue runs out |
| `src/playback/reporter.ts` | Playback events. The server decides what counts as a play |
| `src/app` | Screens. Each tab is its own stack; album, artist, playlist and the rest live in `(tabs)/(home,search,library,friends)` so they open inside whichever tab you are in, under the mini player |

The sign-in token is kept in the keychain (`expo-secure-store`). Everything else the app
persists (settings for the first frame, recent searches, sermon progress) is in AsyncStorage
and is replaced by the account's copy when it loads.

## Check before committing

```bash
npx expo lint
npx tsc --noEmit
```
