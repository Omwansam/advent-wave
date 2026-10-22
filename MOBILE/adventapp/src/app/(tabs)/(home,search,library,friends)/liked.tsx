import { router } from 'expo-router';

import { getMediaBatch } from '@/api';
import { asTracks } from '@/api/models';
import { Collection } from '@/components/Collection';
import { EmptyState } from '@/components/States';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';

/** Liked Songs: the library's ids, resolved in one batch, newest like first. */
export default function LikedScreen() {
  const ids = useLibraryStore((s) => s.likedSongIds);
  const loaded = useLibraryStore((s) => s.loaded);
  const newestFirst = [...ids].reverse();
  const key = loaded ? `liked:${newestFirst.join(',')}` : null;
  const res = useAsync(key, (signal) => getMediaBatch(newestFirst, { signal }));
  // Unliking from a row removes it here at once, before the refetch lands.
  const tracks = asTracks(res.data).filter((t) => ids.includes(t.id));
  return (
    <Collection
      title="Liked Songs"
      meta={`${ids.length} ${ids.length === 1 ? 'song' : 'songs'}`}
      gradient={['#6d5df6', '#c9a227']}
      coverIcon="heart"
      tracks={tracks}
      loading={!loaded || (res.loading && ids.length > 0)}
      error={res.error}
      onRetry={res.reload}
      onRefresh={() => void useLibraryStore.getState().load()}
      empty={
        <EmptyState
          icon="heart-outline"
          title="Songs you like will appear here"
          body="Save songs by tapping the heart."
          action={{ title: 'Find songs', onPress: () => router.navigate('/search') }}
        />
      }
    />
  );
}
