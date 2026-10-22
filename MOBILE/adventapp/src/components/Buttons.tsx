import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type IconName = keyof typeof Ionicons.glyphMap;

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
}

/** A pressable that dims and shrinks a little under the finger, like every row in a music app. */
export function Touchable({ style, children, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}>
      {children as ReactNode}
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  name: IconName;
  size?: number;
  color?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

export function IconButton({ name, size = 24, color, label, style, active, ...rest }: IconButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [styles.icon, style, pressed && { opacity: 0.6 }, rest.disabled && { opacity: 0.35 }]}>
      <Ionicons name={name} size={size} color={color ?? (active ? t.primary : t.text)} />
      {active ? <View style={[styles.dot, { backgroundColor: t.primary }]} /> : null}
    </Pressable>
  );
}

interface PlayButtonProps {
  playing: boolean;
  buffering?: boolean;
  onPress: () => void;
  size?: number;
  /** The light-on-dark disc of the full player rather than the brand colour. */
  inverted?: boolean;
}

/** The round play/pause disc: playlist headers, the full player. */
export function PlayButton({ playing, buffering, onPress, size = 52, inverted }: PlayButtonProps) {
  const t = useTheme();
  const bg = inverted ? t.text : t.primary;
  const fg = inverted ? t.bg : t.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.play,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}>
      {buffering && playing ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={size * 0.46}
          color={fg}
          style={playing ? undefined : { marginLeft: size * 0.06 }}
        />
      )}
    </Pressable>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, compact }: ButtonProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: bg, borderColor: variant === 'outline' ? t.border : 'transparent' },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 15 : 18} color={fg} /> : null}
          <Text variant={compact ? 'caption' : 'bodyStrong'} style={{ color: fg, fontWeight: '700' }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** A rounded filter chip: Library's Playlists / Artists, Search's result kinds. */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? t.primary : t.elevated, borderColor: active ? t.primary : t.border },
        pressed && { opacity: 0.8 },
      ]}>
      <Text variant="caption" style={{ color: active ? t.onPrimary : t.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  dot: { position: 'absolute', bottom: -1, width: 4, height: 4, borderRadius: 2 },
  play: { alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
  },
  compact: { minHeight: 34, paddingHorizontal: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
