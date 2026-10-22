import { Platform } from 'react-native';

/**
 * The gateway the app talks to. A build for the stores uses the production server; set
 * EXPO_PUBLIC_API_BASE_URL in `.env.local` to point a development build at your own gateway
 * (`http://10.0.2.2:8080` from the Android emulator, your machine's LAN address from a phone).
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://adventwave.draftbitlabs.tech').replace(
  /\/+$/,
  '',
);

/** What playback events say the listener was using; free text on the server. */
export const DEVICE = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

/** Covers and avatars may come back as paths on the gateway rather than full URLs. */
export function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
