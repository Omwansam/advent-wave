import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Touchable, type IconName } from './Buttons';
import { Cover } from './Cover';
import { Text } from './Text';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  cover?: string;
  onPress: () => void;
  onPressIn?: () => void;
  round?: boolean;
  size?: number;
  icon?: IconName;
}

/** A square (or round, for an artist) tile with a caption: the unit of every shelf. */
export function MediaCard({ title, subtitle, cover, onPress, onPressIn, round, size = 148, icon }: MediaCardProps) {
  return (
    <Touchable
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={{ width: size }}>
      <Cover uri={cover} size={size} radius={round ? 0 : 8} round={round} icon={icon} />
      <Text
        variant="caption"
        numberOfLines={2}
        style={[styles.cardTitle, round && styles.center]}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" tone="muted" numberOfLines={1} style={round ? styles.center : undefined}>
          {subtitle}
        </Text>
      ) : null}
    </Touchable>
  );
}

interface ShelfProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement;
  onSeeAll?: () => void;
}

/** A titled horizontal row of cards; nothing at all when it has nothing to show. */
export function Shelf<T>({ title, subtitle, data, keyOf, renderItem, onSeeAll }: ShelfProps<T>) {
  if (!data.length) return null;
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHead}>
        <View style={{ flex: 1 }}>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {onSeeAll ? (
          <Touchable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={`Show all ${title}`}>
            <Text variant="caption" tone="muted" style={{ fontWeight: '700' }}>
              Show all
            </Text>
          </Touchable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyOf}
        renderItem={({ item, index }) => renderItem(item, index)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfList}
        ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
      />
    </View>
  );
}

interface QuickTileProps {
  title: string;
  cover?: string;
  onPress: () => void;
  onPressIn?: () => void;
  icon?: IconName;
  active?: boolean;
  gradient?: [string, string];
}

/** Home's two-column grid of shortcuts at the top, as in Spotify. */
export function QuickTile({ title, cover, onPress, onPressIn, icon, active, gradient }: QuickTileProps) {
  const t = useTheme();
  return (
    <Touchable
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.quick, { backgroundColor: t.elevated }]}>
      {gradient ? (
        <LinearGradient colors={gradient} style={styles.quickArt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon ?? 'heart'} size={22} color="#ffffff" />
        </LinearGradient>
      ) : (
        <Cover uri={cover} size={56} radius={0} icon={icon} />
      )}
      <Text
        variant="caption"
        numberOfLines={2}
        style={[styles.quickTitle, active && { color: t.primary }]}>
        {title}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  cardTitle: { marginTop: 8, fontWeight: '600' },
  center: { textAlign: 'center' },
  shelf: { marginTop: 26 },
  shelfHead: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  shelfList: { paddingHorizontal: 16 },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 6, overflow: 'hidden' },
  quickArt: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { flex: 1, paddingHorizontal: 10, fontWeight: '700' },
});
