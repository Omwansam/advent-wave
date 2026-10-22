import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { searchUsers } from '@/api';
import type { Friend, UserSummaryDto } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { Touchable } from '@/components/Buttons';
import { FollowButton } from '@/components/FollowButton';
import { EmptyState } from '@/components/States';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { formatAgo } from '@/lib/format';
import { go } from '@/lib/nav';
import { useFriendsStore } from '@/store/friends';
import { usePlayerStore } from '@/store/player';
import { useSettingsStore } from '@/store/settings';
import { useTheme } from '@/theme';

/** How often what friends are playing is re-read while this tab is on screen. */
const POLL_MS = 30_000;
const MIN_QUERY = 2;

/** Friend activity (RFC 0007): who you follow and what they are playing, and finding more of them. */
export default function FriendsScreen() {
  const t = useTheme();
  const friends = useFriendsStore((s) => s.friends);
  const loaded = useFriendsStore((s) => s.loaded);
  const load = useFriendsStore((s) => s.load);
  const shareActivity = useSettingsStore((s) => s.shareActivity);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const searching = [...query.trim()].length >= MIN_QUERY;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Friends" />
      <View style={[styles.field, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name="person-add-outline" size={18} color={t.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find friends by name"
          placeholderTextColor={t.muted}
          autoCorrect={false}
          maxLength={100}
          style={[styles.input, { color: t.text }]}
          accessibilityLabel="Find friends by name"
        />
      </View>
      {searching ? (
        <FindFriends query={query.trim()} />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id ?? ''}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={t.muted}
            />
          }
          ListHeaderComponent={
            !shareActivity ? (
              <View style={[styles.note, { backgroundColor: t.elevated }]}>
                <Ionicons name="eye-off-outline" size={18} color={t.muted} />
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  You are not sharing what you play. Turn on Share listening activity in Settings to let friends see it.
                </Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            loaded ? (
              <EmptyState
                icon="people-outline"
                title="Listen with friends"
                body="Follow people to see what they are playing. Search for them by name above."
              />
            ) : undefined
          }
          renderItem={({ item }) => <FriendRow friend={item} />}
        />
      )}
    </View>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const t = useTheme();
  const track = useFriendsStore((s) => (friend.activity?.mediaItemId ? s.tracks[friend.activity.mediaItemId] : undefined));
  const activity = track ? friend.activity : undefined;
  const openProfile = () => friend.id && go.user(friend.id);
  // The profile and the track are two separate buttons side by side: a button inside a button
  // is not allowed on the web, and a screen reader cannot reach the inner one.
  return (
    <View style={styles.row}>
      <Touchable onPress={openProfile} accessibilityRole="button" accessibilityLabel={`${friend.displayName}'s profile`}>
        <Avatar name={friend.displayName} size={48} />
        {activity?.playing ? <View style={[styles.live, { backgroundColor: t.primary, borderColor: t.bg }]} /> : null}
      </Touchable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Touchable onPress={openProfile} accessibilityRole="button" style={styles.nameRow}>
          <Text variant="body" numberOfLines={1} style={{ fontWeight: '700', flex: 1 }}>
            {friend.displayName}
          </Text>
          {activity ? (
            <Text variant="caption" tone={activity.playing ? 'primary' : 'muted'}>
              {activity.playing ? 'Listening now' : formatAgo(activity.atEpochMs ?? 0)}
            </Text>
          ) : null}
        </Touchable>
        {track ? (
          <Touchable
            onPress={() => usePlayerStore.getState().playSong(track, [track])}
            accessibilityRole="button"
            accessibilityLabel={`Play ${track.title}`}>
            <Text variant="caption" numberOfLines={1}>
              <Ionicons name="musical-note" size={12} color={t.muted} /> {track.title}
              <Text variant="caption" tone="muted">
                {' · '}
                {track.artist}
              </Text>
            </Text>
          </Touchable>
        ) : (
          <Text variant="caption" tone="muted">
            No recent activity
          </Text>
        )}
      </View>
    </View>
  );
}

function FindFriends({ query }: { query: string }) {
  const [results, setResults] = useState<{ q: string; users: UserSummaryDto[] } | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchUsers(query, { signal: controller.signal })
        .then((res) => {
          setResults({ q: query, users: (res.users ?? []).filter((u) => u.id) });
          setError(null);
        })
        .catch((err) => {
          if ((err as Error)?.name !== 'AbortError') setError(err);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  if (error) {
    return (
      <Text variant="caption" tone="muted" style={{ padding: 24, textAlign: 'center' }}>
        Search is not available right now.
      </Text>
    );
  }
  const users = results?.q === query ? results.users : null;
  if (!users) {
    return (
      <Text variant="caption" tone="muted" style={{ padding: 24, textAlign: 'center' }}>
        Searching…
      </Text>
    );
  }
  if (!users.length) {
    return (
      <Text variant="caption" tone="muted" style={{ padding: 24, textAlign: 'center' }}>
        No one by that name.
      </Text>
    );
  }
  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id ?? ''}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Touchable onPress={() => item.id && go.user(item.id)} style={styles.person} accessibilityRole="button">
            <Avatar name={item.displayName} size={44} />
            <Text variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
              {item.displayName}
            </Text>
          </Touchable>
          <FollowButton userId={item.id ?? ''} name={item.displayName ?? ''} followedByMe={item.followedByMe} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
  },
  input: { flex: 1, fontSize: 15, height: 42 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  live: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: 16, padding: 12, borderRadius: 10 },
});
