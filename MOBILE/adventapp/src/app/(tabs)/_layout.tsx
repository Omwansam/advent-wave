import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme';

/**
 * Four tabs, each its own stack, with the mini player and the tab bar drawn by TabBar. The
 * detail screens (album, artist, playlist…) live in `(home,search,library,friends)`, so they
 * open inside whichever tab the listener is in.
 */
export const unstable_settings = { anchor: '(home)' };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(search)" />
      <Tabs.Screen name="(library)" />
      <Tabs.Screen name="(friends)" />
    </Tabs>
  );
}
