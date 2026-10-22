import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** The home tab's own stack; the detail screens shared by every tab are pushed onto it. */
export const unstable_settings = { anchor: 'index' };

export default function HomeStack() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />;
}
