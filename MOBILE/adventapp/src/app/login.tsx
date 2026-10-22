import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { AuthShell, Field, FormError } from '@/components/AuthShell';
import { Button } from '@/components/Buttons';
import { Text } from '@/components/Text';
import { describeError } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const t = useTheme();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      // The protected stack swaps to the app on its own once the token is set.
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Hymns, choirs, sermons and podcasts from Adventist churches.">
      <FormError message={error} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="you@example.com"
      />
      <Field
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder="Your password"
      />
      <Button title="Log in" onPress={submit} loading={busy} />
      <Link href="/forgot-password" style={[styles.link, { color: t.muted }]}>
        Forgot your password?
      </Link>
      <View style={[styles.divider, { backgroundColor: t.border }]} />
      <Text variant="body" tone="muted" style={styles.center}>
        New to AdventWave?
      </Text>
      <Button title="Create an account" variant="outline" onPress={() => router.push('/register')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { textAlign: 'center', fontWeight: '700', fontSize: 14, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  center: { textAlign: 'center' },
});
