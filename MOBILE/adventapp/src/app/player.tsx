import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Track } from '@/api/models';
import type { ChapterDto } from '@/api/types';
import { IconButton, PlayButton, tap } from '@/components/Buttons';
import { Cover } from '@/components/Cover';
import { Scrubber } from '@/components/Scrubber';
import { Sheet, SheetItem } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { formatDuration, nameHue } from '@/lib/format';
import { formatRate, isLongForm, itemNoun, PLAYBACK_RATES, trackSeconds } from '@/lib/longForm';
import { go, leavePlayer } from '@/lib/nav';
import { next, previous, seekTo, skipBy } from '@/playback/engine';
import { indexAt, useChapters, useLyrics, type Lyrics } from '@/playback/useMediaText';
import { useLibraryStore } from '@/store/library';
import { usePlayerStore } from '@/store/player';
import { isSleepTimerActive, useSleepTimerStore } from '@/store/sleepTimer';
import { showToast } from '@/store/toast';
import { useUiStore } from '@/store/ui';
import { useTheme } from '@/theme';

const SLEEP_MINUTES = [5, 15, 30, 45, 60];

/** The full player: artwork, position, every control, and the words or chapters underneath. */
export default function PlayerScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const track = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const buffering = usePlayerStore((s) => s.buffering);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const rate = usePlayerStore((s) => s.playbackRate);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const sleepActive = useSleepTimerStore(isSleepTimerActive);
  const liked = useLibraryStore((s) => (track ? s.likedSongIds.includes(track.id) || s.savedSermonIds.includes(track.id) : false));
  const [sleepOpen, setSleepOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);

  // Nothing playing (the queue was cleared from the lock screen): there is nothing to show.
  useEffect(() => {
    if (!track && router.canGoBack()) router.back();
  }, [track]);

  if (!track) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const longForm = isLongForm(track);
  const art = Math.min(width - 48, 420);
  const tint = `hsl(${nameHue(track.album || track.title)}, 45%, ${t.scheme === 'dark' ? 28 : 68}%)`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient colors={[tint, t.bg]} locations={[0, 0.75]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 32 }}>
        <View style={styles.top}>
          <IconButton name="chevron-down" size={28} label="Close player" onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="label" tone="muted">
              Playing from queue
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700' }}>
              {queueLength === 1 ? '1 item' : `${queueLength} items`}
            </Text>
          </View>
          <IconButton
            name="ellipsis-horizontal"
            size={24}
            label="More options"
            onPress={() => useUiStore.getState().openTrackSheet({ track })}
          />
        </View>

        <View style={[styles.artWrap, { width: art, height: art }]}>
          <Cover uri={track.cover} size={art} radius={10} icon={longForm ? 'mic' : 'musical-notes'} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="title" numberOfLines={2}>
                {track.title}
              </Text>
              <Pressable
                disabled={!track.artistId}
                onPress={() => leavePlayer(() => go.artist(track.artistId as string))}
                accessibilityRole="link">
                <Text variant="body" tone="muted" numberOfLines={1}>
                  {track.artist}
                </Text>
              </Pressable>
            </View>
            <IconButton
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? t.primary : t.text}
              label={liked ? 'Remove from your library' : 'Add to your library'}
              onPress={async () => {
                tap();
                const now = await useLibraryStore.getState().toggleLike(track.id, track.mediaType);
                if (now === null) showToast("Couldn't update your library. Try again.");
              }}
            />
          </View>

          <Scrubber fallbackDuration={trackSeconds(track)} />

          {longForm ? (
            <View style={styles.controls}>
              <Pressable onPress={() => setSpeedOpen(true)} style={styles.rate} accessibilityRole="button" accessibilityLabel="Playback speed">
                <Text variant="bodyStrong" style={{ color: rate === 1 ? t.text : t.primary }}>
                  {formatRate(rate)}
                </Text>
              </Pressable>
              <IconButton name="play-back" size={30} label="Back 15 seconds" onPress={() => skipBy(-15)} />
              <PlayButton playing={isPlaying} buffering={buffering} onPress={() => usePlayerStore.getState().togglePlay()} size={70} inverted />
              <IconButton name="play-forward" size={30} label="Forward 30 seconds" onPress={() => skipBy(30)} />
              <IconButton name="play-skip-forward" size={26} label="Next" onPress={next} />
            </View>
          ) : (
            <View style={styles.controls}>
              <IconButton
                name="shuffle"
                size={26}
                active={shuffle}
                color={shuffle ? t.primary : t.text}
                label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                onPress={() => usePlayerStore.getState().toggleShuffle()}
              />
              <IconButton name="play-skip-back" size={34} label="Previous" onPress={previous} />
              <PlayButton playing={isPlaying} buffering={buffering} onPress={() => usePlayerStore.getState().togglePlay()} size={70} inverted />
              <IconButton name="play-skip-forward" size={34} label="Next" onPress={next} />
              <IconButton
                name="repeat"
                size={26}
                active={repeat !== 'off'}
                color={repeat !== 'off' ? t.primary : t.text}
                label={repeat === 'off' ? 'Repeat all' : repeat === 'all' ? 'Repeat one' : 'Turn repeat off'}
                onPress={() => usePlayerStore.getState().cycleRepeat()}
              />
              {repeat === 'one' ? (
                <View style={[styles.one, { backgroundColor: t.primary }]} pointerEvents="none">
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>1</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.bottom}>
            <IconButton
              name={sleepActive ? 'moon' : 'moon-outline'}
              size={22}
              color={sleepActive ? t.primary : t.text}
              label="Sleep timer"
              onPress={() => setSleepOpen(true)}
            />
            {buffering && isPlaying ? <ActivityIndicator size="small" color={t.muted} /> : null}
            <IconButton name="list" size={24} label="Queue" onPress={() => router.push('/queue')} />
          </View>

          {longForm ? <ChaptersCard track={track} /> : <LyricsCard track={track} />}
        </View>
      </ScrollView>

      <Sheet visible={sleepOpen} onClose={() => setSleepOpen(false)} header={<Text variant="subheading" style={styles.sheetTitle}>Sleep timer</Text>}>
        {SLEEP_MINUTES.map((m) => (
          <SheetItem
            key={m}
            icon="time-outline"
            label={`${m} minutes`}
            onPress={() => {
              useSleepTimerStore.getState().setMinutes(m);
              setSleepOpen(false);
              showToast(`Sleep timer set for ${m} minutes`);
            }}
          />
        ))}
        <SheetItem
          icon="stop-circle-outline"
          label={`End of ${itemNoun(track)}`}
          onPress={() => {
            useSleepTimerStore.getState().setEndOfItem();
            setSleepOpen(false);
            showToast(`Pausing at the end of this ${itemNoun(track)}`);
          }}
        />
        {sleepActive ? (
          <SheetItem
            icon="close-circle-outline"
            label="Turn off timer"
            tone="danger"
            onPress={() => {
              useSleepTimerStore.getState().cancel();
              setSleepOpen(false);
              showToast('Sleep timer off');
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={speedOpen} onClose={() => setSpeedOpen(false)} header={<Text variant="subheading" style={styles.sheetTitle}>Playback speed</Text>}>
        {PLAYBACK_RATES.map((r) => (
          <SheetItem
            key={r}
            icon="speedometer-outline"
            label={formatRate(r)}
            active={rate === r}
            onPress={() => {
              usePlayerStore.getState().setPlaybackRate(r);
              setSpeedOpen(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

/** Synced lyrics follow the song and seek on tap; unsynced ones are just the words. */
function LyricsCard({ track }: { track: Track }) {
  const { data, loading } = useLyrics(track);
  if (loading || !data) return null;
  return (
    <View style={[styles.card, { backgroundColor: 'rgba(109,93,246,0.22)' }]}>
      <Text variant="subheading" style={{ marginBottom: 12 }}>
        Lyrics
      </Text>
      <LyricLines lyrics={data} />
      {data.credit ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 14 }}>
          {data.credit}
        </Text>
      ) : null}
    </View>
  );
}

function LyricLines({ lyrics }: { lyrics: Lyrics }) {
  const t = useTheme();
  const currentMs = usePlayerStore((s) => Math.round(s.currentTime * 1000));
  const active = lyrics.synced ? indexAt(lyrics.lines, currentMs) : -1;
  return (
    <View style={{ gap: 8 }}>
      {lyrics.lines.map((line, i) => (
        <Pressable
          key={`${i}:${line.startMs ?? ''}`}
          disabled={!lyrics.synced || line.startMs == null}
          onPress={() => seekTo((line.startMs ?? 0) / 1000)}>
          <Text
            variant="heading"
            style={{
              color: !lyrics.synced || i === active ? t.text : i < active ? t.muted : 'rgba(255,255,255,0.45)',
              ...(t.scheme === 'light' && lyrics.synced && i > active ? { color: t.muted } : null),
            }}>
            {line.text || '♪'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A sermon's chapters: where each part starts; the current one is marked, any one is a tap away. */
function ChaptersCard({ track }: { track: Track }) {
  const t = useTheme();
  const { data } = useChapters(track);
  const currentMs = usePlayerStore((s) => Math.round(s.currentTime * 1000));
  const chapters = useMemo<ChapterDto[]>(() => data ?? [], [data]);
  const active = indexAt(chapters, currentMs);
  if (!chapters.length) return null;
  return (
    <View style={[styles.card, { backgroundColor: t.surface }]}>
      <Text variant="subheading" style={{ marginBottom: 6 }}>
        Chapters
      </Text>
      {chapters.map((c, i) => (
        <Pressable key={`${i}:${c.startMs}`} onPress={() => seekTo((c.startMs ?? 0) / 1000)} style={styles.chapter}>
          <Ionicons name={i === active ? 'volume-medium' : 'ellipse-outline'} size={14} color={i === active ? t.primary : t.muted} />
          <Text variant="body" numberOfLines={2} style={{ flex: 1, fontWeight: i === active ? '700' : '500', color: i === active ? t.primary : t.text }}>
            {c.title}
          </Text>
          <Text variant="caption" tone="muted">
            {formatDuration((c.startMs ?? 0) / 1000)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 18 },
  artWrap: {
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  body: { paddingHorizontal: 24, marginTop: 26, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  rate: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  one: { position: 'absolute', right: 2, top: 8, width: 13, height: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { borderRadius: 14, padding: 18, marginTop: 14 },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  sheetTitle: { paddingHorizontal: 20, paddingBottom: 6 },
});
