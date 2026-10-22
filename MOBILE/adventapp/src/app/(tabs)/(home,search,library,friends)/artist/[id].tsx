import { useLocalSearchParams } from 'expo-router';

import { getArtist } from '@/api';
import { asTracks } from '@/api/models';
import { Button } from '@/components/Buttons';
import { Collection } from '@/components/Collection';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { showToast } from '@/store/toast';

/** An artist — a choir, a quartet, a speaker — and their most played items. */
export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const following = useLibraryStore((s) => s.followedArtistIds.includes(id));
  const res = useAsync(id ? `artist:${id}` : null, (signal) => getArtist(id, { signal }));
  const artist = res.data;
  const tracks = asTracks(artist?.tracks);
  return (
    <Collection
      title={artist?.name ?? ''}
      meta={artist?.verified ? 'Verified artist' : 'Artist'}
      cover={artist?.cover}
      coverIcon="person"
      round
      tracks={tracks}
      loading={res.loading}
      error={res.error}
      onRetry={res.reload}
      onRefresh={res.refresh}
      refreshing={res.refreshing}
      actions={
        <Button
          compact
          variant="outline"
          title={following ? 'Following' : 'Follow'}
          onPress={async () => {
            try {
              await useLibraryStore.getState().toggleFollowArtist(id, artist?.name);
              showToast(following ? `Unfollowed ${artist?.name ?? ''}` : `Following ${artist?.name ?? ''}`);
            } catch {
              showToast("Couldn't update your library. Try again.");
            }
          }}
        />
      }
    />
  );
}
