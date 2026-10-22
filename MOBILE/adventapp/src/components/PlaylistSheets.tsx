import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { go } from '@/lib/nav';
import { useLibraryStore } from '@/store/library';
import { showToast } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';
import { Button, Touchable } from './Buttons';
import { Cover } from './Cover';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** Pick one of the listener's playlists for the chosen tracks, or start a new one with them. */
export function AddToPlaylistSheet() {
  const t = useTheme();
  const tracks = useUiStore((s) => s.addToPlaylist);
  const close = useUiStore((s) => s.closeAddToPlaylist);
  const playlists = useLibraryStore((s) => s.userPlaylists);
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (playlistId: string, title: string) => {
    if (!tracks) return;
    const ids = tracks.map((x) => x.id);
    const existing = playlists.find((p) => p.id === playlistId)?.songIds ?? [];
    const fresh = ids.filter((id) => !existing.includes(id));
    if (!fresh.length) {
      showToast(`Already in ${title}`);
      close();
      return;
    }
    setBusy(playlistId);
    try {
      await useLibraryStore.getState().addToPlaylist(playlistId, fresh);
      showToast(`Added to ${title}`);
      close();
    } catch {
      showToast("Couldn't add it. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      visible={Boolean(tracks)}
      onClose={close}
      header={
        <View style={styles.head}>
          <Text variant="subheading">Add to playlist</Text>
          <Button
            title="New playlist"
            icon="add"
            compact
            onPress={() => {
              close();
              useUiStore.getState().setCreatePlaylistOpen(true);
            }}
          />
        </View>
      }>
      {playlists.length === 0 ? (
        <Text variant="caption" tone="muted" style={styles.empty}>
          You have no playlists yet. Make one, then add to it.
        </Text>
      ) : (
        playlists.map((p) => (
          <Touchable
            key={p.id}
            onPress={() => add(p.id, p.title)}
            disabled={busy != null}
            accessibilityRole="button"
            style={[styles.row, busy === p.id && { opacity: 0.5 }]}>
            <Cover uri={p.cover ?? p.songs?.[0]?.cover} size={48} radius={4} icon="musical-notes" />
            <View style={{ flex: 1 }}>
              <Text variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
                {p.title}
              </Text>
              <Text variant="caption" tone="muted">
                {(p.songIds?.length ?? 0) === 1 ? '1 item' : `${p.songIds?.length ?? 0} items`}
              </Text>
            </View>
          </Touchable>
        ))
      )}
      <View style={{ height: 8, borderTopColor: t.border }} />
    </Sheet>
  );
}

/** Names a new playlist; adds whatever was waiting to go into one, then opens it. */
export function CreatePlaylistSheet() {
  const t = useTheme();
  const open = useUiStore((s) => s.createPlaylistOpen);
  const setOpen = useUiStore((s) => s.setCreatePlaylistOpen);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const playlist = await useLibraryStore.getState().createPlaylist(title || 'My playlist');
      setOpen(false);
      setTitle('');
      showToast(`Created ${playlist.title}`);
      go.playlist(playlist.id);
    } catch {
      showToast("Couldn't create the playlist. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={open} onClose={() => setOpen(false)}>
      <View style={styles.form}>
        <Text variant="heading" style={{ textAlign: 'center' }}>
          Give your playlist a name
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="My playlist"
          placeholderTextColor={t.muted}
          autoFocus
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={create}
          style={[styles.input, { color: t.text, borderBottomColor: t.primary }]}
        />
        <Button title="Create" onPress={create} loading={busy} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  empty: { paddingHorizontal: 20, paddingVertical: 24, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  form: { padding: 24, gap: 24 },
  input: { fontSize: 24, fontWeight: '700', textAlign: 'center', borderBottomWidth: 2, paddingVertical: 10 },
});
