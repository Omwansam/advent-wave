import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** The library tab's own stack; the detail screens shared by every tab are pushed onto it. */
export const unstable_settings = { anchor: 'library' };

export default function LibraryStack() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />;
}
