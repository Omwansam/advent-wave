import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { isLongForm, trackSeconds } from '@/lib/longForm';
import { go } from '@/lib/nav';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { showToast } from '@/store/toast';
import { MINI_PLAYER_HEIGHT, useTheme } from '@/theme';
import { tap } from './Buttons';
import { Cover } from './Cover';
import { Text } from './Text';

/** The bar above the tabs: what is playing, like, play/pause, and a hairline of progress. */
export function MiniPlayer() {
  const t = useTheme();
  const track = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const buffering = usePlayerStore((s) => s.buffering);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const liked = useLibraryStore((s) =>
    track ? s.likedSongIds.includes(track.id) || s.savedSermonIds.includes(track.id) : false,
  );

  if (!track) return null;
  // Opening the player, liking and play/pause are three buttons side by side: on the web each is
  // a <button>, and a button cannot contain another.
  return (
    <View style={[styles.bar, { backgroundColor: t.elevated }]}>
      <View style={styles.row}>
        <Pressable
          onPress={go.player}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${track.title}. Open player`}
          style={styles.open}>
          <Cover uri={track.cover} size={42} radius={5} icon={isLongForm(track) ? 'mic' : 'musical-notes'} />
          <View style={styles.text}>
            <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700', color: t.text }}>
              {track.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from your library' : 'Add to your library'}
          onPress={async () => {
            tap();
            const now = await useLibraryStore.getState().toggleLike(track.id, track.mediaType);
            if (now === null) showToast("Couldn't update your library. Try again.");
          }}
          style={styles.btn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? t.primary : t.text} />
        </Pressable>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={() => {
            tap();
            togglePlay();
          }}
          style={styles.btn}>
          {buffering && isPlaying ? (
            <ActivityIndicator color={t.text} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={t.text} />
          )}
        </Pressable>
      </View>
      <MiniProgress fallback={trackSeconds(track)} />
    </View>
  );
}

/** Its own component so the 500 ms position ticks re-render this line and nothing else. */
function MiniProgress({ fallback }: { fallback: number }) {
  const t = useTheme();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration) || fallback;
  const pct = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  return (
    <View style={[styles.progress, { backgroundColor: t.border }]}>
      <View style={{ width: `${pct * 100}%`, height: 2, backgroundColor: t.text }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: MINI_PLAYER_HEIGHT,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  open: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  text: { flex: 1, minWidth: 0 },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progress: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, borderRadius: 1, overflow: 'hidden' },
});
