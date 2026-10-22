import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** The search tab's own stack; the detail screens shared by every tab are pushed onto it. */
export const unstable_settings = { anchor: 'search' };

export default function SearchStack() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />;
}
