import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changePassword, resendVerification, signOutEverywhere } from '@/api';
import { Avatar } from '@/components/Avatar';
import { Button, IconButton, Touchable } from '@/components/Buttons';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { API_BASE_URL } from '@/lib/config';
import { describeError } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore, type AudioQuality } from '@/store/settings';
import { showToast } from '@/store/toast';
import { useTheme } from '@/theme';

/** What the manifest picks for each setting (plan §11.2); the same words as the web's Settings. */
const QUALITY: { id: AudioQuality; label: string; detail: string }[] = [
  { id: 'data_saver', label: 'Data saver', detail: 'About 24 kbps. For patchy mobile data.' },
  { id: 'normal', label: 'Normal', detail: 'About 96 kbps for music, 64 for sermons.' },
  { id: 'high', label: 'High', detail: 'About 160 kbps for music, 128 for sermons.' },
  { id: 'very_high', label: 'Very high', detail: 'About 320 kbps for music.' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const s = useSettingsStore();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const confirm = (title: string, body: string, action: string, run: () => void) => {
    if (Platform.OS === 'web') return run();
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={styles.head}>
        <IconButton name="chevron-back" size={26} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="heading">Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.account, { backgroundColor: t.surface }]}>
          <Avatar name={user?.name ?? user?.email} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="subheading" numberOfLines={1}>
              {user?.name || 'Listener'}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {user?.email}
            </Text>
            {user && user.emailVerified === false ? (
              <Touchable
                onPress={async () => {
                  try {
                    await resendVerification();
                    showToast('Verification email sent');
                  } catch (err) {
                    showToast(describeError(err));
                  }
                }}
                accessibilityRole="button">
                <Text variant="caption" tone="gold" style={{ fontWeight: '700', marginTop: 4 }}>
                  Email not verified · Send the link again
                </Text>
              </Touchable>
            ) : null}
          </View>
          {user?.id ? (
            <IconButton
              name="chevron-forward"
              size={20}
              color={t.muted}
              label="View your profile"
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id as string } })}
            />
          ) : null}
        </View>

        <Section title="Audio quality">
          {QUALITY.map((q) => (
            <Touchable
              key={q.id}
              onPress={() => s.set('audioQuality', q.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: s.audioQuality === q.id }}
              style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {q.label}
                </Text>
                <Text variant="caption" tone="muted">
                  {q.detail}
                </Text>
              </View>
              <Ionicons
                name={s.audioQuality === q.id ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={s.audioQuality === q.id ? t.primary : t.muted}
              />
            </Touchable>
          ))}
        </Section>

        <Section title="Playback">
          <Toggle
            label="Normalize volume"
            detail="Plays every item at the same loudness."
            value={s.normalizeAudio}
            onChange={(v) => s.set('normalizeAudio', v)}
          />
          <Toggle
            label="Autoplay"
            detail="When your queue ends, keep playing something similar."
            value={s.autoplay}
            onChange={(v) => s.set('autoplay', v)}
          />
        </Section>

        <Section title="Social">
          <Toggle
            label="Private session"
            detail="What you play stays out of your history and recommendations."
            value={s.privateSession}
            onChange={(v) => s.set('privateSession', v)}
          />
          <Toggle
            label="Share listening activity"
            detail="People who follow you see what you are playing."
            value={s.shareActivity}
            onChange={(v) => s.set('shareActivity', v)}
          />
        </Section>

        <Section title="Display">
          <Toggle label="Dark theme" value={s.theme === 'dark'} onChange={(v) => s.set('theme', v ? 'dark' : 'light')} />
        </Section>

        <Section title="Account">
          <Row icon="key-outline" label="Change password" onPress={() => setPasswordOpen(true)} />
          <Row
            icon="phone-portrait-outline"
            label="Sign out everywhere"
            onPress={() =>
              confirm('Sign out everywhere?', 'Every device signed in to this account, this one too, will need to log in again.', 'Sign out', async () => {
                try {
                  await signOutEverywhere();
                } catch {
                  // The session may already be gone; signing out here is what matters.
                }
                await useAuthStore.getState().logout();
              })
            }
          />
          <Row
            icon="log-out-outline"
            label="Log out"
            tone="danger"
            onPress={() => confirm('Log out?', 'You can log back in at any time.', 'Log out', () => void useAuthStore.getState().logout())}
          />
        </Section>

        <Text variant="caption" tone="muted" style={styles.about}>
          AdventWave {Constants.expoConfig?.version ?? ''} · {API_BASE_URL.replace(/^https?:\/\//, '')}
        </Text>
      </ScrollView>
      <PasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <Text variant="label" tone="muted" style={{ paddingHorizontal: 20, marginBottom: 6 }}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: t.surface }]}>{children}</View>
    </View>
  );
}

function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.primary, false: t.border }}
        thumbColor="#ffffff"
        accessibilityLabel={label}
      />
    </View>
  );
}

function Row({ icon, label, onPress, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tone?: 'danger' }) {
  const t = useTheme();
  const color = tone === 'danger' ? t.danger : t.text;
  return (
    <Touchable onPress={onPress} accessibilityRole="button" style={styles.item}>
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="body" style={{ flex: 1, color, fontWeight: '600' }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={t.muted} />
    </Touchable>
  );
}

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = [styles.input, { color: t.text, backgroundColor: t.elevated, borderColor: t.border }];

  const submit = async () => {
    if ([...next].length < 8) {
      setError('Choose a new password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Every other session ends; this one gets a fresh token.
      const session = await changePassword(current, next);
      await useAuthStore.getState().applySession(session);
      setCurrent('');
      setNext('');
      onClose();
      showToast('Password changed. Other devices have been signed out.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ padding: 20, gap: 14 }}>
        <Text variant="heading">Change password</Text>
        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}
        <TextInput
          value={current}
          onChangeText={setCurrent}
          placeholder="Current password"
          placeholderTextColor={t.muted}
          secureTextEntry
          autoComplete="current-password"
          style={input}
        />
        <TextInput
          value={next}
          onChangeText={setNext}
          placeholder="New password (at least 8 characters)"
          placeholderTextColor={t.muted}
          secureTextEntry
          autoComplete="new-password"
          style={input}
        />
        <Button title="Change password" onPress={submit} loading={busy} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 14 },
  card: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 13 },
  about: { textAlign: 'center', marginTop: 28 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
});
