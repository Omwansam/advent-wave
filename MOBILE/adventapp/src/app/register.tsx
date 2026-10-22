import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, type TextInputInstance } from 'react-native';

import { AuthShell, Field, FormError } from '@/components/AuthShell';
import { Button } from '@/components/Buttons';
import { Text } from '@/components/Text';
import { describeError } from '@/lib/format';
import { useAuthStore } from '@/store/auth';

/** The server's rule (ListenerAuthProperties.minPasswordLength); it checks again. */
const MIN_PASSWORD = 8;

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const tooShort = password.length > 0 && [...password].length < MIN_PASSWORD;

  const submit = async () => {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if ([...password].length < MIN_PASSWORD) {
      setError(`Choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({ email, password, name });
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free, and the same account works on the web.">
      <FormError message={error} />
      <Field
        label="What should we call you?"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="Your name"
        maxLength={100}
      />
      <Field
        ref={emailRef}
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder={`At least ${MIN_PASSWORD} characters`}
        error={tooShort ? `At least ${MIN_PASSWORD} characters.` : null}
      />
      <Button title="Create account" onPress={submit} loading={busy} />
      <Text variant="caption" tone="muted" style={styles.center}>
        Already have one?{' '}
        <Text variant="caption" tone="primary" style={{ fontWeight: '700' }} onPress={() => router.back()}>
          Log in
        </Text>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
