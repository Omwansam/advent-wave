import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { formatDuration } from '@/lib/format';
import { seekTo } from '@/playback/engine';
import { usePlayerStore } from '@/store/player';
import { useTheme } from '@/theme';
import { Text } from './Text';

/**
 * The full player's position bar. Dragging moves only the thumb and the time under it; the
 * seek happens once, on release, so the audio does not stutter through every point passed.
 */
export function Scrubber({ fallbackDuration }: { fallbackDuration: number }) {
  const t = useTheme();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const storeDuration = usePlayerStore((s) => s.duration);
  const duration = storeDuration > 0 ? storeDuration : fallbackDuration;
  const [drag, setDrag] = useState<number | null>(null);
  const [width, setWidth] = useState(1);

  // Rebuilt when the item's length or the bar's width changes; neither moves during a drag.
  const responder = useMemo(() => {
    const at = (x: number) => Math.min(1, Math.max(0, x / width)) * duration;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => duration > 0,
      onMoveShouldSetPanResponder: () => duration > 0,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => setDrag(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => setDrag(at(e.nativeEvent.locationX)),
      onPanResponderRelease: (e) => {
        const to = at(e.nativeEvent.locationX);
        setDrag(null);
        seekTo(to);
      },
      onPanResponderTerminate: () => setDrag(null),
    });
  }, [width, duration]);

  const shown = drag ?? currentTime;
  const pct = duration > 0 ? Math.min(1, shown / duration) : 0;

  return (
    <View>
      <View
        {...responder.panHandlers}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width || 1)}
        style={styles.hit}
        accessibilityRole="adjustable"
        accessibilityLabel="Position"
        accessibilityValue={{ text: `${formatDuration(shown)} of ${formatDuration(duration)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => seekTo(currentTime + (e.nativeEvent.actionName === 'increment' ? 15 : -15))}>
        <View pointerEvents="none" style={[styles.track, { backgroundColor: t.border }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: t.text }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: `${pct * 100}%`, backgroundColor: t.text, transform: [{ scale: drag != null ? 1.4 : 1 }] },
          ]}
        />
      </View>
      <View style={styles.times}>
        <Text variant="caption" tone="muted" style={styles.time}>
          {formatDuration(shown)}
        </Text>
        <Text variant="caption" tone="muted" style={styles.time}>
          -{formatDuration(Math.max(0, duration - shown))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, top: 8 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontVariant: ['tabular-nums'] },
});
