import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore } from '@/store/toast';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** One line of feedback above the tab bar: "Added to queue", "Couldn't play …". */
export function Toast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const seq = useToastStore((s) => s.seq);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // The web has no native animation driver; asking for one there only logs a warning.
    Animated.timing(anim, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [message, seq, anim]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 140,
          backgroundColor: t.scheme === 'dark' ? '#f2f0f7' : '#2d2a35',
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      <Text variant="caption" style={{ color: t.scheme === 'dark' ? '#121118' : '#ffffff', fontWeight: '600' }}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
