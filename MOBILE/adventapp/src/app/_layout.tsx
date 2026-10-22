import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddToPlaylistSheet, CreatePlaylistSheet } from '@/components/PlaylistSheets';
import { Toast } from '@/components/Toast';
import { TrackSheet } from '@/components/TrackSheet';
import { releaseFocusOnClick } from '@/lib/webFocus';
import { useSession } from '@/playback/session';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * The root: restores the session from the keychain and loads the icon font while the splash
 * screen is up, then shows sign-in or the app. The player and the queue are modals over the
 * tabs; the row sheets and the toast are mounted once, here, above everything.
 */
export default function RootLayout() {
  const restored = useAuthStore((s) => s.restored);
  const token = useAuthStore((s) => s.token);
  const t = useTheme();
  // Every icon is Ionicons: loaded behind the splash, so no screen draws placeholder glyphs first.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const ready = restored && (fontsLoaded || fontError != null);

  useEffect(() => {
    void useAuthStore.getState().restore();
  }, []);

  useEffect(() => releaseFocusOnClick(), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useSession(token);

  const navTheme = useMemo(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: t.primary, background: t.bg, card: t.surface, text: t.text, border: t.border },
    };
  }, [t]);

  if (!ready) return null;

  const signedIn = Boolean(token);
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="player"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: true }}
            />
            <Stack.Screen name="queue" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack.Protected>
        </Stack>
        {signedIn ? (
          <>
            <TrackSheet />
            <AddToPlaylistSheet />
            <CreatePlaylistSheet />
          </>
        ) : null}
        <Toast />
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
