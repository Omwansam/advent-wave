import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { go } from '@/lib/nav';
import { useAuthStore } from '@/store/auth';
import { Avatar } from './Avatar';
import { Touchable } from './Buttons';
import { Text } from './Text';

/** A tab's top: the listener's avatar (to settings), a big title, and the tab's own actions. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const name = useAuthStore((s) => s.user?.name ?? s.user?.email);
  return (
    <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
      <Touchable onPress={go.settings} accessibilityRole="button" accessibilityLabel="Settings and account">
        <Avatar name={name} size={34} />
      </Touchable>
      <Text variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
