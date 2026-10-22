import { Platform, Alert } from 'react-native';

import { getHistory } from '@/api';
import { asTracks } from '@/api/models';
import { Button } from '@/components/Buttons';
import { Collection } from '@/components/Collection';
import { EmptyState } from '@/components/States';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { showToast } from '@/store/toast';

/** Listening history (`/v1/history`), newest first, as the server recorded it. */
export default function HistoryScreen() {
  const recent = useLibraryStore((s) => s.recentTrackIds.length);
  const res = useAsync(`history:${recent}`, (signal) => getHistory({ signal }));
  const byId = new Map(asTracks(res.data?.tracks).map((t) => [t.id, t]));
  const tracks = (res.data?.entries ?? []).flatMap((e) => {
    const track = e.id ? byId.get(e.id) : undefined;
    return track ? [track] : [];
  });

  const clear = () => {
    const doIt = async () => {
      try {
        await useLibraryStore.getState().clearHistory();
        res.reload();
        showToast('Listening history cleared');
      } catch {
        showToast("Couldn't clear your history. Try again.");
      }
    };
    if (Platform.OS === 'web') return void doIt();
    Alert.alert('Clear listening history?', 'This removes it from every device. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => void doIt() },
    ]);
  };

  return (
    <Collection
      title="Listening history"
      meta="Recently played"
      gradient={['#2e2c3a', '#121118']}
      coverIcon="time"
      tracks={tracks}
      loading={res.loading}
      error={res.error}
      onRetry={res.reload}
      onRefresh={res.refresh}
      refreshing={res.refreshing}
      actions={tracks.length ? <Button compact variant="outline" title="Clear" icon="trash-outline" onPress={clear} /> : null}
      empty={<EmptyState icon="time-outline" title="Nothing played yet" body="What you listen to shows up here." />}
    />
  );
}
