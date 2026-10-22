import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT, useTheme } from '@/theme';
import { tap, type IconName } from './Buttons';
import { MiniPlayer } from './MiniPlayer';
import { Text } from './Text';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  '(home)': { label: 'Home', icon: 'home-outline', active: 'home' },
  '(search)': { label: 'Search', icon: 'search-outline', active: 'search' },
  '(library)': { label: 'Your Library', icon: 'library-outline', active: 'library' },
  '(friends)': { label: 'Friends', icon: 'people-outline', active: 'people' },
};

/**
 * The bottom chrome: the mini player sits on top of the tabs, as in Spotify, and both stay put
 * while the listener moves through the stack inside a tab.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <MiniPlayer />
      <View
        accessibilityRole="tablist"
        style={[
          styles.tabs,
          { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, borderTopColor: t.border },
        ]}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                tap();
                // A second press on the tab you are in goes back to its top, as every tab app does.
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.tab}>
              <Ionicons name={focused ? meta.active : meta.icon} size={24} color={focused ? t.text : t.muted} />
              <Text variant="caption" style={[styles.label, { color: focused ? t.text : t.muted }]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6 },
  label: { fontSize: 10.5, fontWeight: '600' },
});
