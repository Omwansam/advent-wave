import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { getPlaylists } from '@/api';
import { asPlaylists } from '@/api/models';
import { Chip, IconButton, Touchable, type IconName } from '@/components/Buttons';
import { Cover } from '@/components/Cover';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { plural } from '@/lib/format';
import { go } from '@/lib/nav';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

type Filter = 'all' | 'playlists' | 'artists' | 'sermons';

interface Row {
  key: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  cover?: string;
  icon?: IconName;
  round?: boolean;
  gradient?: [string, string];
  kind: Exclude<Filter, 'all'>;
}

/** Your Library: liked songs, saved sermons, your playlists and the ones you follow, your artists. */
export default function LibraryScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const lib = useLibraryStore();
  const playlists = useAsync('playlists', (signal) => getPlaylists({ signal }));

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [
      {
        key: 'liked',
        title: 'Liked Songs',
        subtitle: `Playlist · ${plural(lib.likedSongIds.length, 'song')}`,
        gradient: ['#6d5df6', '#c9a227'],
        icon: 'heart',
        onPress: go.liked,
        kind: 'playlists',
      },
    ];
    if (lib.savedSermonIds.length) {
      out.push({
        key: 'saved-sermons',
        title: 'Saved sermons',
        subtitle: plural(lib.savedSermonIds.length, 'sermon'),
        gradient: ['#3b2f8f', '#121118'],
        icon: 'bookmark',
        onPress: () => go.sermons(),
        kind: 'sermons',
      });
    }
    out.push({
      key: 'history',
      title: 'Listening history',
      subtitle: plural(lib.recentTrackIds.length, 'item'),
      gradient: ['#2e2c3a', '#121118'],
      icon: 'time',
      onPress: go.history,
      kind: 'playlists',
    });
    for (const p of lib.userPlaylists) {
      out.push({
        key: `mine:${p.id}`,
        title: p.title,
        subtitle: `Playlist · ${plural(p.songIds?.length ?? p.songs?.length ?? 0, 'item')}`,
        cover: p.cover ?? p.songs?.[0]?.cover,
        onPress: () => go.playlist(p.id),
        kind: 'playlists',
      });
    }
    const curated = asPlaylists(playlists.data?.curated);
    for (const p of curated.filter((x) => lib.followedPlaylistIds.includes(x.id))) {
      out.push({
        key: `followed:${p.id}`,
        title: p.title,
        subtitle: 'Playlist · AdventWave',
        cover: p.cover ?? p.songs?.[0]?.cover,
        onPress: () => go.playlist(p.id),
        kind: 'playlists',
      });
    }
    lib.followedArtistIds.forEach((id, i) => {
      out.push({
        key: `artist:${id}`,
        title: lib.followedArtistNames[i] ?? 'Artist',
        subtitle: 'Artist',
        icon: 'person',
        round: true,
        onPress: () => go.artist(id),
        kind: 'artists',
      });
    });
    out.push({
      key: 'sermons',
      title: 'Sermons',
      subtitle: 'Pick up where you left off',
      icon: 'mic',
      gradient: ['#7c5cff', '#2b1f66'],
      onPress: go.sermons,
      kind: 'sermons',
    });
    out.push({
      key: 'podcasts',
      title: 'Podcasts',
      subtitle: 'Episodes and series',
      icon: 'radio',
      gradient: ['#c9a227', '#6d4c00'],
      onPress: go.podcasts,
      kind: 'sermons',
    });
    return out;
  }, [lib, playlists.data]);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.kind === filter);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Your Library"
        right={
          <IconButton
            name="add"
            size={28}
            label="Create playlist"
            onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)}
          />
        }
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(
            [
              ['playlists', 'Playlists'],
              ['artists', 'Artists'],
              ['sermons', 'Sermons & podcasts'],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} label={label} active={filter === id} onPress={() => setFilter(filter === id ? 'all' : id)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={lib.loading || playlists.refreshing}
            onRefresh={() => {
              void lib.load();
              playlists.refresh();
            }}
            tintColor={t.muted}
          />
        }
        renderItem={({ item }) => (
          <Touchable onPress={item.onPress} accessibilityRole="button" style={styles.row}>
            {item.gradient && !item.cover ? (
              <LinearGradient colors={item.gradient} style={[styles.art, item.round && { borderRadius: 32 }]}>
                <Ionicons name={item.icon ?? 'musical-notes'} size={26} color="#ffffff" />
              </LinearGradient>
            ) : (
              <Cover uri={item.cover} size={64} radius={4} round={item.round} icon={item.icon} />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
                {item.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
          </Touchable>
        )}
        ListFooterComponent={
          filter === 'artists' && !lib.followedArtistIds.length ? (
            <Text variant="caption" tone="muted" style={styles.hint}>
              Artists you follow appear here. Open any artist and tap Follow.
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  art: { width: 64, height: 64, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', padding: 24 },
});
