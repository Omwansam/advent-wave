import { useSettingsStore } from '@/store/settings';

/**
 * The web app's palette (`--aw-*` in advent-wave/src/index.css), so an account looks like
 * itself on both. The theme is the account's setting, synced like the rest of user_settings.
 */
export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  gold: string;
  danger: string;
  scrim: string;
  /** Mini-player and tab bar: a touch lighter than the page so they read as chrome. */
  chrome: string;
}

const brand = {
  primary: '#6d5df6',
  onPrimary: '#ffffff',
  gold: '#c9a227',
  danger: '#e5484d',
};

export const dark: Palette = {
  scheme: 'dark',
  bg: '#121118',
  surface: '#1a1824',
  elevated: '#232030',
  text: '#eceaf2',
  muted: '#9b95ad',
  border: '#2e2c3a',
  primarySoft: 'rgba(109, 93, 246, 0.18)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  chrome: '#1d1b28',
  ...brand,
};

export const light: Palette = {
  scheme: 'light',
  bg: '#f7f7f9',
  surface: '#ffffff',
  elevated: '#f0f0f4',
  text: '#2d2a35',
  muted: '#6b6578',
  border: '#e8e7ed',
  primarySoft: 'rgba(109, 93, 246, 0.12)',
  scrim: 'rgba(20, 18, 30, 0.45)',
  chrome: '#ffffff',
  ...brand,
};

export function useTheme(): Palette {
  const theme = useSettingsStore((s) => s.theme);
  return theme === 'light' ? light : dark;
}

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
/** Height of the tab bar's own row, without the bottom inset. */
export const TAB_BAR_HEIGHT = 56;
export const MINI_PLAYER_HEIGHT = 60;
