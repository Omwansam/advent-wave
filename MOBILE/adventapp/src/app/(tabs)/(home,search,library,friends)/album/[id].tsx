import { useLocalSearchParams } from 'expo-router';

import { getAlbum } from '@/api';
import { asTracks } from '@/api/models';
import { IconButton } from '@/components/Buttons';
import { Collection } from '@/components/Collection';
import { go } from '@/lib/nav';
import { useAsync } from '@/lib/useAsync';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

/** An album, its tracks numbered in order. */
export default function AlbumScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useAsync(id ? `album:${id}` : null, (signal) => getAlbum(id, { signal }));
  const album = res.data;
  const tracks = asTracks(album?.tracks);
  return (
    <Collection
      title={album?.title ?? ''}
      meta={['Album', album?.artist].filter(Boolean).join(' · ')}
      cover={album?.cover ?? tracks[0]?.cover}
      coverIcon="disc"
      tracks={tracks}
      numbered
      loading={res.loading}
      error={res.error}
      onRetry={res.reload}
      onRefresh={res.refresh}
      refreshing={res.refreshing}
      actions={
        <>
          {album?.artistId ? (
            <IconButton name="person-circle-outline" size={28} color={t.muted} label="Go to artist" onPress={() => go.artist(album.artistId as string)} />
          ) : null}
          <IconButton
            name="add-circle-outline"
            size={26}
            color={t.muted}
            label="Add all to a playlist"
            disabled={!tracks.length}
            onPress={() => useUiStore.getState().openAddToPlaylist(tracks)}
          />
        </>
      }
    />
  );
}
