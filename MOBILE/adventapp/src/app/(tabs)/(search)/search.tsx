import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBrowse, search } from '@/api';
import { asPlaylists, asTracks, type Playlist, type Track } from '@/api/models';
import type { AlbumDto, ArtistDto, DiscoverCategoryDto, PlaylistDto, TrackDto } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Chip, IconButton, Touchable } from '@/components/Buttons';
import { MediaCard, Shelf } from '@/components/Cards';
import { Cover } from '@/components/Cover';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { TrackRow } from '@/components/TrackRow';
import { resolveUrl } from '@/lib/config';
import { gradientColors } from '@/lib/format';
import { go } from '@/lib/nav';
import { useAsync } from '@/lib/useAsync';
import { useAuthStore } from '@/store/auth';
import { usePlayerStore } from '@/store/player';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

const MIN_QUERY = 2;
const SEARCH_DELAY_MS = 300;

type Kind = 'all' | 'songs' | 'sermons' | 'podcasts' | 'artists' | 'albums' | 'playlists' | 'lyrics';
const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'sermons', label: 'Sermons' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'lyrics', label: 'Lyrics' },
];

/** Search: browse categories when empty, the server's ranked results (`/v1/search`) as you type. */
export default function SearchScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const name = useAuthStore((s) => s.user?.name ?? s.user?.email);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const trimmed = query.trim();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const active = [...debounced].length >= MIN_QUERY;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <View style={styles.titleRow}>
          <Touchable onPress={go.settings} accessibilityRole="button" accessibilityLabel="Settings and account">
            <Avatar name={name} size={34} />
          </Touchable>
          <Text variant="title">Search</Text>
        </View>
        <View style={[styles.field, { backgroundColor: t.scheme === 'dark' ? '#f2f0f7' : t.surface, borderColor: t.border }]}>
          <Ionicons name="search" size={20} color="#2d2a35" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="What do you want to listen to?"
            placeholderTextColor="#6b6578"
            returnKeyType="search"
            autoCorrect={false}
            maxLength={200}
            onSubmitEditing={() => useUiStore.getState().rememberSearch(trimmed)}
            style={styles.input}
            accessibilityLabel="Search songs, sermons, artists and lyrics"
          />
          {query ? <IconButton name="close" size={20} color="#2d2a35" label="Clear search" onPress={() => setQuery('')} /> : null}
        </View>
      </View>
      {active ? (
        <Results q={debounced} kind={kind} setKind={setKind} />
      ) : (
        <Browse onPickRecent={(q) => setQuery(q)} />
      )}
    </View>
  );
}

function Browse({ onPickRecent }: { onPickRecent: (q: string) => void }) {
  const t = useTheme();
  const recent = useUiStore((s) => s.recentSearches);
  const browse = useAsync('browse', (signal) => getBrowse({ signal }));
  const categories = (browse.data?.categories ?? []).filter((c): c is DiscoverCategoryDto & { id: string } => Boolean(c.id));

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} onScrollBeginDrag={Keyboard.dismiss}>
      {recent.length ? (
        <View style={{ marginTop: 8 }}>
          <View style={styles.sectionHead}>
            <Text variant="subheading">Recent searches</Text>
            <Touchable onPress={() => useUiStore.getState().clearSearches()} accessibilityRole="button">
              <Text variant="caption" tone="muted" style={{ fontWeight: '700' }}>
                Clear
              </Text>
            </Touchable>
          </View>
          {recent.map((q) => (
            <View key={q} style={styles.recent}>
              <Touchable onPress={() => onPickRecent(q)} style={styles.recentTerm} accessibilityRole="button">
                <Ionicons name="time-outline" size={20} color={t.muted} />
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {q}
                </Text>
              </Touchable>
              <IconButton
                name="close"
                size={18}
                color={t.muted}
                label={`Remove ${q} from recent searches`}
                onPress={() => useUiStore.getState().forgetSearch(q)}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="subheading" style={styles.browseTitle}>
        Browse all
      </Text>
      {browse.loading ? (
        <Loading />
      ) : browse.error ? (
        <ErrorState error={browse.error} onRetry={browse.reload} />
      ) : (
        <View style={styles.grid}>
          {[
            { id: '__sermons', label: 'Sermons', gradient: '#7c5cff #2b1f66', onPress: go.sermons },
            { id: '__podcasts', label: 'Podcasts', gradient: '#c9a227 #6d4c00', onPress: go.podcasts },
            ...categories.map((c) => ({ ...c, onPress: () => go.category(c.id, c.label) })),
          ].map((c) => (
            <View key={c.id} style={styles.cell}>
              <Touchable onPress={c.onPress} accessibilityRole="button" accessibilityLabel={c.label} style={styles.tile}>
                <LinearGradient
                  colors={gradientColors(c.gradient, ['#6d5df6', '#2b1f66'])}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                {'cover' in c && c.cover ? (
                  <Image source={{ uri: resolveUrl(c.cover) }} style={styles.tileArt} contentFit="cover" />
                ) : null}
                <Text variant="subheading" style={styles.tileLabel} numberOfLines={2}>
                  {c.label}
                </Text>
              </Touchable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Results({ q, kind, setKind }: { q: string; kind: Kind; setKind: (k: Kind) => void }) {
  const t = useTheme();
  const res = useAsync(`search:${q}`, (signal) => search(q, { signal }));

  useEffect(() => {
    if (res.data) useUiStore.getState().rememberSearch(q);
  }, [res.data, q]);

  const r = useMemo(() => {
    const d = res.data;
    return {
      songs: asTracks(d?.songs),
      sermons: asTracks(d?.sermons),
      podcasts: asTracks(d?.podcasts),
      artists: (d?.artists ?? []).filter((a): a is ArtistDto & { id: string } => Boolean(a.id)),
      albums: (d?.albums ?? []).filter((a): a is AlbumDto & { id: string } => Boolean(a.id)),
      playlists: asPlaylists(d?.playlists),
      lyrics: (d?.lyricsMatches ?? []).flatMap((m) => {
        const [track] = asTracks(m.track ? [m.track] : []);
        return track ? [{ track, line: m.line ?? '' }] : [];
      }),
      top: d?.topResult ?? null,
    };
  }, [res.data]);

  if (res.loading) return <Loading />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;

  const total =
    r.songs.length + r.sermons.length + r.podcasts.length + r.artists.length + r.albums.length + r.playlists.length + r.lyrics.length;
  if (!total) {
    return <EmptyState icon="search" title={`No results for "${q}"`} body="Check the spelling, or try fewer or different words." />;
  }

  const play = (track: Track, list: Track[]) => usePlayerStore.getState().playSong(track, list);
  const show = (k: Kind) => kind === 'all' || kind === k;
  const counts: Record<Kind, number> = {
    all: total,
    songs: r.songs.length,
    sermons: r.sermons.length,
    podcasts: r.podcasts.length,
    artists: r.artists.length,
    albums: r.albums.length,
    playlists: r.playlists.length,
    lyrics: r.lyrics.length,
  };

  const listOf = (title: string, k: Kind, tracks: Track[]) =>
    show(k) && tracks.length ? (
      <View style={{ marginTop: 18 }}>
        <Text variant="subheading" style={styles.listTitle}>
          {title}
        </Text>
        {(kind === 'all' ? tracks.slice(0, 5) : tracks).map((x) => (
          <TrackRow key={x.id} track={x} onPress={() => play(x, tracks)} />
        ))}
      </View>
    ) : null;

  return (
    <FlatList
      data={[0]}
      keyExtractor={() => 'results'}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
          {KINDS.filter((k) => counts[k.id] > 0).map((k) => (
            <Chip key={k.id} label={k.label} active={kind === k.id} onPress={() => setKind(k.id)} />
          ))}
        </ScrollView>
      }
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={() => (
        <View>
          {kind === 'all' && r.top ? <TopResult top={r.top} onPlay={play} /> : null}
          {listOf('Songs', 'songs', r.songs)}
          {listOf('Sermons', 'sermons', r.sermons)}
          {listOf('Podcasts', 'podcasts', r.podcasts)}
          {show('lyrics') && r.lyrics.length ? (
            <View style={{ marginTop: 18 }}>
              <Text variant="subheading" style={styles.listTitle}>
                From the lyrics
              </Text>
              {r.lyrics.map(({ track, line }) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  subtitle={`“${line}”`}
                  onPress={() => play(track, r.lyrics.map((x) => x.track))}
                />
              ))}
            </View>
          ) : null}
          {show('artists') && r.artists.length ? (
            kind === 'all' ? (
              <Shelf
                title="Artists"
                data={r.artists}
                keyOf={(a) => a.id}
                renderItem={(a) => (
                  <MediaCard title={a.name ?? 'Artist'} subtitle="Artist" cover={a.cover} round size={120} icon="person" onPress={() => go.artist(a.id)} />
                )}
              />
            ) : (
              r.artists.map((a) => (
                <Touchable key={a.id} onPress={() => go.artist(a.id)} style={styles.entity} accessibilityRole="button">
                  <Cover uri={a.cover} size={56} round icon="person" />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {a.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      Artist
                    </Text>
                  </View>
                </Touchable>
              ))
            )
          ) : null}
          {show('albums') && r.albums.length ? (
            <Shelf
              title="Albums"
              data={r.albums}
              keyOf={(a) => a.id}
              renderItem={(a) => (
                <MediaCard title={a.title ?? 'Album'} subtitle={a.artist} cover={a.cover} icon="disc" onPress={() => go.album(a.id)} />
              )}
            />
          ) : null}
          {show('playlists') && r.playlists.length ? (
            <Shelf
              title="Playlists"
              data={r.playlists}
              keyOf={(p) => p.id}
              renderItem={(p: Playlist) => (
                <MediaCard title={p.title} subtitle={p.description} cover={p.cover ?? p.songs?.[0]?.cover} onPress={() => go.playlist(p.id)} />
              )}
            />
          ) : null}
          <View style={{ height: 1, backgroundColor: t.bg }} />
        </View>
      )}
    />
  );
}

/** The best match across every kind, in a large card as Spotify shows it. */
function TopResult({ top, onPlay }: { top: { type?: string; item?: unknown }; onPlay: (t: Track, list: Track[]) => void }) {
  const t = useTheme();
  const item = top.item as (TrackDto & ArtistDto & AlbumDto & PlaylistDto) | undefined;
  if (!item?.id) return null;
  const id = item.id;
  const type = top.type ?? 'song';
  let title = item.title ?? item.name ?? '';
  let subtitle = '';
  let onPress: () => void;
  let round = false;
  if (type === 'artist') {
    title = item.name ?? title;
    subtitle = 'Artist';
    round = true;
    onPress = () => go.artist(id);
  } else if (type === 'album') {
    subtitle = `Album · ${item.artist ?? ''}`;
    onPress = () => go.album(id);
  } else if (type === 'playlist') {
    subtitle = 'Playlist';
    onPress = () => go.playlist(id);
  } else {
    const [track] = asTracks([item]);
    subtitle = `${type === 'sermon' ? 'Sermon' : type === 'podcast' ? 'Episode' : 'Song'} · ${item.artist ?? ''}`;
    onPress = () => onPlay(track, [track]);
  }
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      <Text variant="subheading" style={{ marginBottom: 10 }}>
        Top result
      </Text>
      <Touchable onPress={onPress} accessibilityRole="button" style={[styles.top, { backgroundColor: t.elevated }]}>
        <Cover uri={item.cover} size={92} round={round} radius={6} icon={round ? 'person' : type === 'sermon' ? 'mic' : 'musical-notes'} />
        <Text variant="title" numberOfLines={2} style={{ marginTop: 14 }}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {subtitle}
        </Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 10, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 12, height: 46, borderWidth: 1 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#121118', height: 46 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  recent: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 10 },
  recentTerm: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  browseTitle: { paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: '50%', padding: 4 },
  tile: { height: 100, borderRadius: 8, overflow: 'hidden', padding: 12 },
  tileArt: {
    position: 'absolute',
    right: -14,
    bottom: -4,
    width: 72,
    height: 72,
    borderRadius: 4,
    transform: [{ rotate: '25deg' }],
  },
  tileLabel: { color: '#ffffff', maxWidth: '75%' },
  kinds: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  listTitle: { paddingHorizontal: 16, marginBottom: 6 },
  entity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  top: { padding: 16, borderRadius: 10 },
});
