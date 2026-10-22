import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBrowse } from '@/api';
import { asTracks } from '@/api/models';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { progressStatus, useProgressMap } from '@/store/progress';
import { useTheme } from '@/theme';
import { Chip, IconButton } from './Buttons';
import { EmptyState, ErrorState, Loading } from './States';
import { Text } from './Text';
import { TrackRow } from './TrackRow';

type Filter = 'all' | 'in-progress' | 'unplayed' | 'saved';

const EMPTY: Record<Filter, string> = {
  all: 'Nothing here yet.',
  'in-progress': 'Nothing in progress. Whatever you stop partway through waits for you here.',
  unplayed: 'You have started everything here.',
  saved: 'Save a sermon from its ⋯ menu and it waits for you here.',
};

/**
 * Sermons or podcast episodes, from Browse, with the web's All / In progress / Unplayed filter
 * (and Saved, for sermons). In progress is newest-listened first: it is a "carry on" list.
 */
export function LongFormList({ kind }: { kind: 'sermons' | 'podcasts' }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const progress = useProgressMap();
  const saved = useLibraryStore((s) => s.savedSermonIds);
  const res = useAsync('browse', (signal) => getBrowse({ signal }));
  const items = useMemo(() => asTracks(kind === 'sermons' ? res.data?.sermons : res.data?.podcasts), [res.data, kind]);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'saved') return items.filter((x) => saved.includes(x.id));
    const matching = items.filter((x) => progressStatus(progress[x.id]) === filter);
    if (filter === 'in-progress') matching.sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt);
    return matching;
  }, [items, filter, progress, saved]);

  const filters: [Filter, string][] = [
    ['all', 'All'],
    ['in-progress', 'In progress'],
    ['unplayed', 'Unplayed'],
  ];
  if (kind === 'sermons') filters.push(['saved', 'Saved']);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={styles.head}>
        <IconButton name="chevron-back" size={26} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="title">{kind === 'sermons' ? 'Sermons' : 'Podcasts'}</Text>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map(([id, label]) => (
            <Chip key={id} label={label} active={filter === id} onPress={() => setFilter(id)} />
          ))}
        </ScrollView>
      </View>
      {res.loading ? (
        <Loading />
      ) : res.error ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={res.refreshing} onRefresh={res.refresh} tintColor={t.muted} />}
          ListEmptyComponent={<EmptyState icon={kind === 'sermons' ? 'mic-outline' : 'radio-outline'} title={EMPTY[filter]} />}
          renderItem={({ item }) => <TrackRow track={item} onPress={() => usePlayerStore.getState().playSong(item, visible)} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
});
