import { StyleSheet, View } from 'react-native';

import { isLongForm } from '@/lib/longForm';
import { go } from '@/lib/nav';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { showToast } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';
import { Cover } from './Cover';
import { Sheet, SheetItem } from './Sheet';
import { Text } from './Text';

/**
 * What a long-press or ⋯ on any row opens: like, queue, add to a playlist, go to the artist or
 * album. One instance at the root, driven by the UI store.
 */
export function TrackSheet() {
  const t = useTheme();
  const ctx = useUiStore((s) => s.trackSheet);
  const close = useUiStore((s) => s.closeTrackSheet);
  const openAddToPlaylist = useUiStore((s) => s.openAddToPlaylist);
  const liked = useLibraryStore((s) =>
    ctx ? s.likedSongIds.includes(ctx.track.id) || s.savedSermonIds.includes(ctx.track.id) : false,
  );
  const ownPlaylist = useLibraryStore((s) => (ctx?.playlistId ? s.userPlaylists.some((p) => p.id === ctx.playlistId) : false));
  const track = ctx?.track;

  const run = (fn: () => void | Promise<void>) => () => {
    close();
    void fn();
  };

  return (
    <Sheet
      visible={Boolean(ctx)}
      onClose={close}
      header={
        track ? (
          <View style={[styles.head, { borderBottomColor: t.border }]}>
            <Cover uri={track.cover} size={52} radius={4} icon={isLongForm(track) ? 'mic' : 'musical-notes'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {track.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {[track.artist, track.album].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : null
      }>
      {track ? (
        <>
          <SheetItem
            icon={liked ? 'heart' : 'heart-outline'}
            active={liked}
            label={liked ? (track.mediaType === 'sermon' ? 'Remove from saved sermons' : 'Remove from Liked Songs') : track.mediaType === 'sermon' ? 'Save sermon' : 'Like'}
            onPress={run(async () => {
              const now = await useLibraryStore.getState().toggleLike(track.id, track.mediaType);
              if (now === null) showToast("Couldn't update your library. Try again.");
              else showToast(now ? 'Added to your library' : 'Removed from your library');
            })}
          />
          <SheetItem icon="add-circle-outline" label="Add to playlist" onPress={() => openAddToPlaylist([track])} />
          {ownPlaylist && ctx?.playlistId ? (
            <SheetItem
              icon="remove-circle-outline"
              label="Remove from this playlist"
              onPress={run(async () => {
                try {
                  await useLibraryStore.getState().removeFromPlaylist(ctx.playlistId as string, track.id);
                  showToast('Removed from playlist');
                } catch {
                  showToast("Couldn't remove it. Try again.");
                }
              })}
            />
          ) : null}
          <SheetItem
            icon="play-forward-outline"
            label="Play next"
            onPress={run(() => {
              usePlayerStore.getState().playNext(track);
              showToast('Playing next');
            })}
          />
          <SheetItem
            icon="list-outline"
            label="Add to queue"
            onPress={run(() => {
              usePlayerStore.getState().enqueueSongs([track]);
              showToast('Added to queue');
            })}
          />
          {ctx?.queueIndex != null ? (
            <SheetItem
              icon="close-circle-outline"
              label="Remove from queue"
              onPress={run(() => usePlayerStore.getState().removeFromQueue(ctx.queueIndex as number))}
            />
          ) : null}
          {track.artistId ? (
            <SheetItem icon="person-outline" label="Go to artist" onPress={run(() => go.artist(track.artistId as string))} />
          ) : null}
          {track.albumId ? (
            <SheetItem icon="disc-outline" label="Go to album" onPress={run(() => go.album(track.albumId as string))} />
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
