import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getArtist } from '@/api';
import { IconButton, Touchable } from '@/components/Buttons';
import { Cover } from '@/components/Cover';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { go } from '@/lib/nav';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { useTheme } from '@/theme';

/** The artists the listener follows. There is no list-by-ids endpoint; follows are few. */
export default function ArtistsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ids = useLibraryStore((s) => s.followedArtistIds);
  const res = useAsync(`artists:${ids.join(',')}`, (signal) => Promise.all(ids.map((id) => getArtist(id, { signal }))));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={styles.head}>
        <IconButton name="chevron-back" size={26} label="Back" onPress={() => router.back()} />
        <Text variant="heading">Your artists</Text>
      </View>
      {res.loading ? (
        <Loading />
      ) : res.error ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (
        <FlatList
          data={(res.data ?? []).filter((a) => a.id)}
          keyExtractor={(a) => a.id as string}
          ListEmptyComponent={<EmptyState icon="person-outline" title="You are not following anyone yet" body="Open any artist and tap Follow." />}
          renderItem={({ item }) => (
            <Touchable onPress={() => go.artist(item.id as string)} style={styles.row} accessibilityRole="button">
              <Cover uri={item.cover} size={60} round icon="person" />
              <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                {item.name}
              </Text>
            </Touchable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
});
