import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHome } from '@/api';
import { asPlaylists, asTracks, type Playlist, type Track } from '@/api/models';
import { Avatar } from '@/components/Avatar';
import { Chip, Touchable } from '@/components/Buttons';
import { MediaCard, QuickTile, Shelf } from '@/components/Cards';
import { ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { greetingLabel, greetingPeriod } from '@/lib/format';
import { isLongForm } from '@/lib/longForm';
import { go } from '@/lib/nav';
import { useAsync } from '@/lib/useAsync';
import { prefetchManifest } from '@/playback/manifest';
import { useAuthStore } from '@/store/auth';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { useTheme } from '@/theme';

type QuickPick =
  | { kind: 'liked' }
  | { kind: 'playlist'; playlist: Playlist }
  | { kind: 'track'; track: Track; queue: Track[] };

/** The Home feed (`GET /v1/home`), laid out as the web app's: greeting, shortcuts, then shelves. */
export default function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const userPlaylists = useLibraryStore((s) => s.userPlaylists);
  const likedCount = useLibraryStore((s) => s.likedSongIds.length);
  const currentId = usePlayerStore((s) => s.currentSong?.id);
  const home = useAsync('home', (signal) => getHome({ signal }));

  const data = useMemo(() => {
    const h = home.data;
    if (!h) return null;
    const rec = h.recommendations ?? {};
    return {
      greeting: greetingLabel(h.greetingPeriod ?? greetingPeriod()),
      recentlyPlayed: asTracks(h.recentlyPlayed),
      trendingNow: asTracks(h.trendingNow),
      sermons: asTracks(h.sermons),
      sabbathWorship: asPlaylists(h.sabbathWorship),
      madeForPlaylists: asPlaylists(rec.recommendedPlaylists),
      madeForSongs: asTracks(rec.recommendedSongs),
      because: rec.becauseYouListened?.artistName
        ? { artist: rec.becauseYouListened.artistName, songs: asTracks(rec.becauseYouListened.songs) }
        : null,
      region: rec.trendingInRegion?.label
        ? { label: rec.trendingInRegion.label, songs: asTracks(rec.trendingInRegion.songs) }
        : null,
    };
  }, [home.data]);

  const quickPicks = useMemo<QuickPick[]>(() => {
    const picks: QuickPick[] = [];
    if (likedCount > 0) picks.push({ kind: 'liked' });
    for (const p of [...userPlaylists, ...(data?.sabbathWorship ?? [])]) {
      if (picks.length >= 4) break;
      if (!picks.some((x) => x.kind === 'playlist' && x.playlist.id === p.id)) picks.push({ kind: 'playlist', playlist: p });
    }
    // A new account has no history yet: what is trending fills the grid instead of leaving it bare.
    const recent = data?.recentlyPlayed.length ? data.recentlyPlayed : (data?.trendingNow ?? []);
    for (const track of recent) {
      if (picks.length >= 8) break;
      picks.push({ kind: 'track', track, queue: recent });
    }
    return picks.slice(0, 8);
  }, [likedCount, userPlaylists, data]);

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const playTrack = (track: Track, queue: Track[]) => usePlayerStore.getState().playSong(track, queue);

  const trackShelf = (title: string, tracks: Track[], opts: { subtitle?: string; onSeeAll?: () => void } = {}) => (
    <Shelf
      title={title}
      subtitle={opts.subtitle}
      onSeeAll={opts.onSeeAll}
      data={tracks}
      keyOf={(x) => x.id}
      renderItem={(x) => (
        <MediaCard
          title={x.title}
          subtitle={x.artist}
          cover={x.cover}
          icon={isLongForm(x) ? 'mic' : 'musical-notes'}
          onPressIn={() => prefetchManifest(x.id)}
          onPress={() => playTrack(x, tracks)}
        />
      )}
    />
  );

  const playlistShelf = (title: string, playlists: Playlist[], subtitle?: string) => (
    <Shelf
      title={title}
      subtitle={subtitle}
      data={playlists}
      keyOf={(p) => p.id}
      renderItem={(p) => (
        <MediaCard
          title={p.title}
          subtitle={p.description || `${p.songIds?.length ?? p.songs?.length ?? 0} items`}
          cover={p.cover ?? p.songs?.[0]?.cover}
          onPress={() => go.playlist(p.id)}
        />
      )}
    />
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} tintColor={t.muted} />}>
      <LinearGradient colors={[t.primarySoft, t.bg]} style={[styles.wash, { height: 320 + insets.top }]} />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Touchable onPress={go.settings} accessibilityRole="button" accessibilityLabel="Settings and account">
          <Avatar name={user?.name ?? user?.email} size={34} />
        </Touchable>
        <View style={styles.chips}>
          <Chip label="Music" onPress={() => router.navigate('/search')} />
          <Chip label="Sermons" onPress={go.sermons} />
          <Chip label="Podcasts" onPress={go.podcasts} />
        </View>
      </View>

      {home.loading ? (
        <Loading />
      ) : home.error && !data ? (
        <ErrorState error={home.error} onRetry={home.reload} />
      ) : data ? (
        <>
          <Text variant="title" style={styles.greeting}>
            {firstName ? `${data.greeting}, ${firstName}` : data.greeting}
          </Text>
          {quickPicks.length ? (
            <View style={styles.grid}>
              {quickPicks.map((p) => (
                <View key={p.kind === 'liked' ? 'liked' : p.kind === 'playlist' ? `p:${p.playlist.id}` : `t:${p.track.id}`} style={styles.cell}>
                  {p.kind === 'liked' ? (
                    <QuickTile title="Liked Songs" gradient={['#6d5df6', '#c9a227']} icon="heart" onPress={go.liked} />
                  ) : p.kind === 'playlist' ? (
                    <QuickTile
                      title={p.playlist.title}
                      cover={p.playlist.cover ?? p.playlist.songs?.[0]?.cover}
                      onPress={() => go.playlist(p.playlist.id)}
                    />
                  ) : (
                    <QuickTile
                      title={p.track.title}
                      cover={p.track.cover}
                      icon={isLongForm(p.track) ? 'mic' : 'musical-notes'}
                      active={currentId === p.track.id}
                      onPressIn={() => prefetchManifest(p.track.id)}
                      onPress={() => playTrack(p.track, p.queue)}
                    />
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {data.madeForPlaylists.length || data.madeForSongs.length ? (
            <Shelf
              title={firstName || 'you'}
              subtitle="Made for"
              data={[
                ...data.madeForPlaylists.map((p) => ({ kind: 'playlist' as const, p })),
                ...data.madeForSongs.map((x) => ({ kind: 'track' as const, x })),
              ]}
              keyOf={(i) => (i.kind === 'playlist' ? `p:${i.p.id}` : `t:${i.x.id}`)}
              renderItem={(i) =>
                i.kind === 'playlist' ? (
                  <MediaCard
                    title={i.p.title}
                    subtitle={i.p.description}
                    cover={i.p.cover ?? i.p.songs?.[0]?.cover}
                    onPress={() => go.playlist(i.p.id)}
                  />
                ) : (
                  <MediaCard
                    title={i.x.title}
                    subtitle={i.x.artist}
                    cover={i.x.cover}
                    onPressIn={() => prefetchManifest(i.x.id)}
                    onPress={() => playTrack(i.x, data.madeForSongs)}
                  />
                )
              }
            />
          ) : null}
          {trackShelf('Recently played', data.recentlyPlayed, { onSeeAll: go.history })}
          {trackShelf('Trending now', data.trendingNow)}
          {data.because ? trackShelf(data.because.artist, data.because.songs, { subtitle: 'Because you listened to' }) : null}
          {playlistShelf('Sabbath worship picks', data.sabbathWorship, 'Rest and worship')}
          {trackShelf('Sermons for you', data.sermons, { onSeeAll: go.sermons })}
          {data.region ? trackShelf(data.region.label, data.region.songs, { subtitle: 'Trending in' }) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 6 },
  chips: { flexDirection: 'row', gap: 8, flex: 1 },
  greeting: { paddingHorizontal: 16, marginTop: 14, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: '50%', padding: 4 },
});
