import { StyleSheet, View } from 'react-native';

import { initials, nameHue } from '@/lib/format';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** A listener has a display name and no picture, so their avatar is their initials (RFC 0007). */
export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsl(${nameHue(name)}, 45%, 42%)`,
          borderColor: t.scheme === 'dark' ? 'rgba(201,162,39,0.25)' : 'rgba(201,162,39,0.35)',
        },
      ]}>
      <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
