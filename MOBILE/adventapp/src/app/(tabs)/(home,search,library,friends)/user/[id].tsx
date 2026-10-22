import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUserProfile } from '@/api';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/Buttons';
import { FollowButton } from '@/components/FollowButton';
import { ErrorState, Loading } from '@/components/States';
import { Text } from '@/components/Text';
import { nameHue, plural } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

/** A listener's public profile (RFC 0007): name, who follows whom. Never an email. */
export default function UserScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useAsync(id ? `user:${id}` : null, (signal) => getUserProfile(id, { signal }));
  const p = res.data;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {res.loading ? (
        <Loading />
      ) : res.error || !p ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (
        <ScrollView>
          <LinearGradient
            colors={[`hsl(${nameHue(p.displayName)}, 40%, ${t.scheme === 'dark' ? 30 : 70}%)`, t.bg]}
            style={[styles.hero, { paddingTop: insets.top + 56 }]}>
            <Avatar name={p.displayName} size={140} />
            <Text variant="display" style={{ marginTop: 18, textAlign: 'center' }}>
              {p.displayName}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
              {plural(p.followerCount ?? 0, 'follower')} · {p.followingCount ?? 0} following
              {p.followsMe ? ' · Follows you' : ''}
            </Text>
            {p.isMe ? (
              <Text variant="caption" tone="muted" style={{ marginTop: 14 }}>
                This is how other listeners see you.
              </Text>
            ) : (
              <View style={{ marginTop: 16 }}>
                <FollowButton userId={id} name={p.displayName ?? ''} followedByMe={p.followedByMe} onChange={() => res.reload()} />
              </View>
            )}
          </LinearGradient>
        </ScrollView>
      )}
      <IconButton
        name="chevron-back"
        size={26}
        label="Back"
        color="#ffffff"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={[styles.back, { top: insets.top + 6 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 24 },
  back: { position: 'absolute', left: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)' },
});
