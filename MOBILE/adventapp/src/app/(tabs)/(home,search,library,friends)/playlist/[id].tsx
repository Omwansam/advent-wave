import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { getPlaylist } from '@/api';
import { asPlaylists } from '@/api/models';
import { Button, IconButton } from '@/components/Buttons';
import { Collection } from '@/components/Collection';
import { Sheet, SheetItem } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useAsync } from '@/lib/useAsync';
import { useAuthStore } from '@/store/auth';
import { useLibraryStore } from '@/store/library';
import { showToast } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

/** A playlist: curated (follow it) or the listener's own (rename, delete, remove items). */
export default function PlaylistScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const own = useLibraryStore((s) => s.userPlaylists.find((p) => p.id === id));
  const following = useLibraryStore((s) => s.followedPlaylistIds.includes(id));
  // The listener's own playlist changes from here and from the row sheets: refetch when it does.
  const version = own ? (own.songIds ?? []).join(',') + own.title + (own.description ?? '') : '';
  const res = useAsync(id ? `playlist:${id}:${version}` : null, (signal) => getPlaylist(id, { signal }));
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  const playlist = res.data ? asPlaylists([res.data])[0] : null;
  const mine = Boolean(own) || (playlist?.ownerId != null && playlist.ownerId === userId);
  const tracks = playlist?.songs ?? [];

  const remove = () => {
    const doIt = async () => {
      try {
        await useLibraryStore.getState().deletePlaylist(id);
        showToast('Playlist deleted');
        router.back();
      } catch {
        showToast("Couldn't delete the playlist. Try again.");
      }
    };
    if (Platform.OS === 'web') {
      void doIt();
      return;
    }
    Alert.alert('Delete playlist?', `"${playlist?.title}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doIt() },
    ]);
  };

  return (
    <>
      <Collection
        title={playlist?.title ?? ''}
        description={playlist?.description}
        meta={mine ? 'Your playlist' : 'AdventWave'}
        cover={playlist?.cover ?? tracks[0]?.cover}
        tracks={tracks}
        playlistId={mine ? id : undefined}
        loading={res.loading}
        error={res.error}
        onRetry={res.reload}
        onRefresh={res.refresh}
        refreshing={res.refreshing}
        actions={
          <>
            {mine ? null : (
              <IconButton
                name={following ? 'heart' : 'heart-outline'}
                size={28}
                color={following ? t.primary : t.muted}
                label={following ? 'Remove from Your Library' : 'Save to Your Library'}
                onPress={async () => {
                  try {
                    await useLibraryStore.getState().toggleFollowPlaylist(id);
                    showToast(following ? 'Removed from Your Library' : 'Saved to Your Library');
                  } catch {
                    showToast("Couldn't update your library. Try again.");
                  }
                }}
              />
            )}
            <IconButton
              name="add-circle-outline"
              size={26}
              color={t.muted}
              label="Add all to a playlist"
              disabled={!tracks.length}
              onPress={() => useUiStore.getState().openAddToPlaylist(tracks)}
            />
            {mine ? (
              <IconButton name="ellipsis-horizontal" size={24} color={t.muted} label="Playlist options" onPress={() => setMenu(true)} />
            ) : null}
          </>
        }
        empty={
          mine ? (
            <EmptyState
              icon="musical-notes-outline"
              title="Let's find something for your playlist"
              body="Long-press any song, or tap ⋯, and choose Add to playlist."
              action={{ title: 'Search', onPress: () => router.navigate('/search') }}
            />
          ) : (
            <EmptyState icon="musical-notes-outline" title="Nothing here yet" />
          )
        }
      />
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <SheetItem
          icon="create-outline"
          label="Edit details"
          onPress={() => {
            setMenu(false);
            setEditing(true);
          }}
        />
        <SheetItem
          icon="trash-outline"
          label="Delete playlist"
          tone="danger"
          onPress={() => {
            setMenu(false);
            remove();
          }}
        />
      </Sheet>
      {playlist ? (
        <EditSheet
          key={`${playlist.id}:${editing}`}
          visible={editing}
          onClose={() => setEditing(false)}
          id={id}
          title={playlist.title}
          description={playlist.description ?? ''}
        />
      ) : null}
    </>
  );
}

function EditSheet(props: { visible: boolean; onClose: () => void; id: string; title: string; description: string }) {
  const t = useTheme();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await useLibraryStore.getState().updatePlaylist(props.id, { title: title.trim() || props.title, description: description.trim() });
      showToast('Playlist updated');
      props.onClose();
    } catch {
      showToast("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const input = [styles.input, { color: t.text, backgroundColor: t.elevated, borderColor: t.border }];
  return (
    <Sheet visible={props.visible} onClose={props.onClose}>
      <View style={styles.form}>
        <Text variant="heading">Edit details</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Name" placeholderTextColor={t.muted} maxLength={100} style={input} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add an optional description"
          placeholderTextColor={t.muted}
          maxLength={300}
          multiline
          style={[input, { minHeight: 90, textAlignVertical: 'top' }]}
        />
        <Button title="Save" onPress={save} loading={busy} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 14 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
});
