import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Track } from '@/api/models';
import { formatDuration, formatTimeLeft } from '@/lib/format';
import { isLongForm, trackSeconds } from '@/lib/longForm';
import { prefetchManifest } from '@/playback/manifest';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { progressStatus, useProgressMap } from '@/store/progress';
import { useUiStore, type TrackSheetContext } from '@/store/ui';
import { useTheme } from '@/theme';
import { IconButton, Touchable } from './Buttons';
import { Cover } from './Cover';
import { Text } from './Text';

interface Props {
  track: Track;
  onPress: () => void;
  /** 1-based position, shown instead of the cover (album tracklists). */
  index?: number;
  /** Extra context for the ⋯ sheet. */
  sheet?: Omit<TrackSheetContext, 'track'>;
  subtitle?: string;
  /** Hides the ⋯ button (the queue has its own controls). */
  hideMore?: boolean;
  right?: ReactNode;
}

/**
 * One item in a list: cover, title, artist, and for sermons and episodes how much is left. The
 * playing item's title is in the brand colour. Pressing in starts fetching its stream manifest,
 * so by the time the finger lifts the first bytes are often already on their way.
 */
export const TrackRow = memo(function TrackRow({ track, onPress, index, sheet, subtitle, hideMore, right }: Props) {
  const t = useTheme();
  const active = usePlayerStore((s) => s.currentSong?.id === track.id);
  const playing = usePlayerStore((s) => s.isPlaying && s.currentSong?.id === track.id);
  const liked = useLibraryStore((s) => s.likedSongIds.includes(track.id) || s.savedSermonIds.includes(track.id));
  const openSheet = useUiStore((s) => s.openTrackSheet);
  const progress = useProgressMap()[track.id];
  const longForm = isLongForm(track);
  const status = longForm ? progressStatus(progress) : 'unplayed';
  const total = trackSeconds(track);

  let meta = subtitle ?? track.artist ?? '';
  if (longForm && status === 'in-progress' && progress) {
    meta = `${formatTimeLeft((progress.durationSec || total) - progress.positionSec)} · ${track.artist ?? ''}`;
  } else if (longForm && status === 'finished') {
    meta = `Played · ${track.artist ?? ''}`;
  }

  // The row's own press area and its ⋯ button sit side by side rather than one inside the other:
  // the web renders both as <button>, which cannot nest, and a screen reader would not reach ⋯.
  return (
    <View style={styles.row}>
    <Touchable
      onPress={onPress}
      onPressIn={() => prefetchManifest(track.id)}
      onLongPress={() => openSheet({ track, ...sheet })}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}, ${track.artist ?? ''}`}
      style={styles.main}>
      {index != null ? (
        <View style={styles.index}>
          {active ? (
            <Ionicons name={playing ? 'stats-chart' : 'pause'} size={14} color={t.primary} />
          ) : (
            <Text variant="body" tone="muted">
              {index}
            </Text>
          )}
        </View>
      ) : (
        <Cover uri={track.cover} size={50} radius={4} icon={longForm ? 'mic' : 'musical-notes'} />
      )}
      <View style={styles.text}>
        <Text variant="body" numberOfLines={1} style={active ? { color: t.primary, fontWeight: '700' } : { fontWeight: '600' }}>
          {track.title}
        </Text>
        <View style={styles.metaRow}>
          {liked ? <Ionicons name="heart" size={12} color={t.primary} /> : null}
          {track.autoplay ? <Ionicons name="infinite" size={13} color={t.muted} /> : null}
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        </View>
        {longForm && status === 'in-progress' && progress && (progress.durationSec || total) > 0 ? (
          <View style={[styles.track, { backgroundColor: t.border }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: t.primary,
                  width: `${Math.min(100, (progress.positionSec / (progress.durationSec || total)) * 100)}%`,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
      {right == null && index != null && total > 0 ? (
        <Text variant="caption" tone="muted">
          {formatDuration(total)}
        </Text>
      ) : null}
    </Touchable>
      {right ??
        (hideMore ? null : (
          <IconButton
            name="ellipsis-vertical"
            size={18}
            color={t.muted}
            label={`More options for ${track.title}`}
            onPress={() => openSheet({ track, ...sheet })}
          />
        ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    paddingLeft: 16,
    paddingRight: 8,
  },
  index: { width: 28, alignItems: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flexShrink: 1 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4, maxWidth: 160 },
  fill: { height: 3, borderRadius: 2 },
});
