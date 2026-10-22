import { router } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Track } from '@/api/models';
import { Button, IconButton } from '@/components/Buttons';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { TrackRow } from '@/components/TrackRow';
import { usePlayerStore } from '@/store/player';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

interface Item {
  track: Track;
  index: number;
}

/** What is playing and what comes next: tap to jump, ⋯ to remove; items autoplay added are marked. */
export default function QueueScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const current = usePlayerStore((s) => s.currentSong);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const upcoming: Item[] = queue.slice(currentIndex + 1).map((track, i) => ({ track, index: currentIndex + 1 + i }));
  const chosen = upcoming.filter((x) => !x.track.autoplay);
  const auto = upcoming.filter((x) => x.track.autoplay);
  const sections = [
    ...(current ? [{ key: 'now', title: 'Now playing', data: [{ track: current, index: currentIndex }] }] : []),
    ...(chosen.length ? [{ key: 'next', title: 'Next in queue', data: chosen }] : []),
    ...(auto.length ? [{ key: 'auto', title: 'Next from: Autoplay', data: auto }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top || 12 }}>
      <View style={styles.head}>
        <IconButton name="chevron-down" size={28} label="Close queue" onPress={() => router.back()} />
        <Text variant="subheading" style={{ flex: 1, textAlign: 'center' }}>
          Queue
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.track.id}:${item.index}:${i}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="list-outline" title="Your queue is empty" body="Play something, or add songs with Add to queue." />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text variant="subheading">{section.title}</Text>
            {section.key === 'next' ? (
              <Button title="Clear queue" variant="outline" compact onPress={() => usePlayerStore.getState().clearUpcoming()} />
            ) : null}
          </View>
        )}
        renderItem={({ item, section }) => (
          <TrackRow
            track={item.track}
            sheet={section.key === 'now' ? undefined : { queueIndex: item.index }}
            onPress={() => {
              if (section.key !== 'now') usePlayerStore.getState().jumpToQueueIndex(item.index);
            }}
            right={
              section.key === 'now' ? undefined : (
                <IconButton
                  name="close"
                  size={20}
                  color={t.muted}
                  label={`Remove ${item.track.title} from queue`}
                  onPress={() => usePlayerStore.getState().removeFromQueue(item.index)}
                />
              )
            }
          />
        )}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, borderTopColor: t.border }]}>
        <IconButton
          name="shuffle"
          size={26}
          active={shuffle}
          color={shuffle ? t.primary : t.text}
          label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
          onPress={() => usePlayerStore.getState().toggleShuffle()}
        />
        <IconButton
          name="repeat"
          size={26}
          active={repeat !== 'off'}
          color={repeat !== 'off' ? t.primary : t.text}
          label={repeat === 'off' ? 'Repeat all' : repeat === 'all' ? 'Repeat one' : 'Turn repeat off'}
          onPress={() => usePlayerStore.getState().cycleRepeat()}
        />
        <Text variant="caption" tone="muted" style={{ flex: 1, textAlign: 'right' }}>
          {repeat === 'one' ? 'Repeating this item' : repeat === 'all' ? 'Repeating the queue' : ''}
        </Text>
        <IconButton
          name="ellipsis-horizontal"
          size={22}
          label="Options for what is playing"
          disabled={!current}
          onPress={() => current && useUiStore.getState().openTrackSheet({ track: current })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
