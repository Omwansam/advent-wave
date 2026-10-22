import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Platform, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Track } from '@/api/models';
import { formatTotal, nameHue, plural } from '@/lib/format';
import { trackSeconds } from '@/lib/longForm';
import { usePlayerStore } from '@/store/player';
import { useTheme } from '@/theme';
import { IconButton, PlayButton, type IconName } from './Buttons';
import { Cover } from './Cover';
import { ErrorState, Loading } from './States';
import { Text } from './Text';
import { TrackRow } from './TrackRow';

interface Props {
  title: string;
  /** A playlist's description, an artist's line. */
  description?: string;
  /** Shown under the title; the item count and total length are appended. */
  meta?: string;
  cover?: string;
  coverIcon?: IconName;
  round?: boolean;
  /** Liked Songs and the like have a gradient instead of artwork. */
  gradient?: [string, string];
  tracks: Track[];
  /** Albums number their tracks instead of showing each cover. */
  numbered?: boolean;
  /** For the row sheet's "Remove from this playlist". */
  playlistId?: string;
  /** Buttons left of shuffle and play: like, follow, edit. */
  actions?: ReactNode;
  empty?: ReactElement;
  /** Under the list: an artist's albums, related shelves. */
  footer?: ReactElement;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * The page every list of items shares — a playlist, an album, Liked Songs, an artist, a
 * category: the artwork over a gradient, title and meta, play and shuffle, then the rows. A
 * slim bar with the title fades in once the big one has scrolled away.
 */
export function Collection(props: Props) {
  const { title, description, meta, cover, coverIcon, round, gradient, tracks, numbered, playlistId } = props;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [scrollY] = useState(() => new Animated.Value(0));
  const art = Math.min(240, width * 0.62);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const buffering = usePlayerStore((s) => s.buffering);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const currentId = usePlayerStore((s) => s.currentSong?.id);
  const playingHere = Boolean(currentId && tracks.some((x) => x.id === currentId));

  const play = () => {
    const s = usePlayerStore.getState();
    if (playingHere) {
      s.togglePlay();
      return;
    }
    if (!tracks.length) return;
    if (s.shuffle) s.playSong(tracks[Math.floor(Math.random() * tracks.length)], tracks);
    else s.playQueue(tracks, 0);
  };

  const toggleShuffle = () => {
    const s = usePlayerStore.getState();
    s.toggleShuffle();
  };

  const totalSec = tracks.reduce((sum, x) => sum + trackSeconds(x), 0);
  const metaLine = [meta, tracks.length ? plural(tracks.length, 'item') : null, totalSec > 0 ? formatTotal(totalSec) : null]
    .filter(Boolean)
    .join(' · ');

  // Each collection gets its own colour from its title, steady across visits, as Spotify tints by artwork.
  const tint = gradient?.[0] ?? `hsl(${nameHue(title)}, 42%, ${t.scheme === 'dark' ? 32 : 72}%)`;
  const barOpacity = scrollY.interpolate({ inputRange: [art * 0.6, art + 40], outputRange: [0, 1], extrapolate: 'clamp' });

  if (props.loading && !tracks.length) return <Loading />;
  if (props.error && !tracks.length) return <ErrorState error={props.error} onRetry={props.onRetry} />;

  const header = (
    <View>
      <LinearGradient
        colors={[tint, t.bg]}
        locations={[0, 1]}
        style={[styles.hero, { paddingTop: insets.top + 52 }]}>
        <View style={[styles.artShadow, round && { borderRadius: art / 2 }]}>
          {gradient && !cover ? (
            <LinearGradient
              colors={gradient}
              style={{ width: art, height: art, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={coverIcon ?? 'heart'} size={art * 0.36} color="#ffffff" />
            </LinearGradient>
          ) : (
            <Cover uri={cover} size={art} radius={6} round={round} icon={coverIcon} />
          )}
        </View>
      </LinearGradient>
      <View style={styles.info}>
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted" numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        {metaLine ? (
          <Text variant="caption" tone="muted">
            {metaLine}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.left}>{props.actions}</View>
        {tracks.length ? (
          <>
            <IconButton
              name="shuffle"
              size={26}
              label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
              active={shuffle}
              color={shuffle ? t.primary : t.muted}
              onPress={toggleShuffle}
            />
            <PlayButton playing={playingHere && isPlaying} buffering={buffering} onPress={play} size={54} />
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Animated.FlatList
        data={tracks}
        keyExtractor={(item, i) => `${item.id}:${i}`}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={numbered ? index + 1 : undefined}
            sheet={playlistId ? { playlistId } : undefined}
            onPress={() => usePlayerStore.getState().playSong(item, tracks)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={props.empty}
        ListFooterComponent={<View style={{ paddingBottom: 24 }}>{props.footer}</View>}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
        scrollEventThrottle={16}
        refreshControl={
          props.onRefresh ? (
            <RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRefresh} tintColor={t.muted} />
          ) : undefined
        }
      />
      <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.surface, opacity: barOpacity }]} />
        <IconButton
          name="chevron-back"
          size={26}
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[styles.back, { backgroundColor: 'rgba(0,0,0,0.25)' }]}
          color="#ffffff"
        />
        <Animated.View style={{ flex: 1, opacity: barOpacity }}>
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 18 },
  artShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  info: { paddingHorizontal: 16, gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10 },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  back: { width: 36, height: 36, borderRadius: 18, marginTop: 6 },
});
