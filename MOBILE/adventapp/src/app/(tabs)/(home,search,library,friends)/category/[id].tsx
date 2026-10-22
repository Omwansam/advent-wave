import { useLocalSearchParams } from 'expo-router';

import { getDiscover } from '@/api';
import { asTracks } from '@/api/models';
import { Collection } from '@/components/Collection';
import { EmptyState } from '@/components/States';
import { gradientColors } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

/** A Browse category (`/v1/discover?cat=`): its editors' picks, playable as one list. */
export default function CategoryScreen() {
  const { id, label } = useLocalSearchParams<{ id: string; label?: string }>();
  const res = useAsync(id ? `discover:${id}` : null, (signal) => getDiscover(id, { signal }));
  const category = res.data?.categories?.find((c) => c.id === id);
  const tracks = asTracks(res.data?.tracks);
  return (
    <Collection
      title={category?.label ?? label ?? 'Browse'}
      meta="Browse"
      gradient={gradientColors(category?.gradient, ['#6d5df6', '#2b1f66'])}
      cover={category?.cover}
      coverIcon="albums"
      tracks={tracks}
      loading={res.loading}
      error={res.error}
      onRetry={res.reload}
      onRefresh={res.refresh}
      refreshing={res.refreshing}
      empty={<EmptyState icon="albums-outline" title="Nothing in this category yet" />}
    />
  );
}
