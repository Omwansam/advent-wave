import { router } from 'expo-router';
import { useState } from 'react';

import { requestPasswordReset } from '@/api';
import { AuthShell, Field, FormError } from '@/components/AuthShell';
import { Button } from '@/components/Buttons';
import { Text } from '@/components/Text';
import { describeError } from '@/lib/format';

/**
 * Asks for a reset email. The server answers the same whether or not the address has an
 * account, so this screen does too. The link in the email opens the web app, where the new
 * password is set.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`If ${email.trim()} has an AdventWave account, a link to reset its password is on its way.`}>
        <Button title="Back to log in" onPress={() => router.back()} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <FormError message={error} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
        placeholder="you@example.com"
      />
      <Button title="Send reset link" onPress={submit} loading={busy} />
      <Text variant="caption" tone="primary" style={{ textAlign: 'center', fontWeight: '700' }} onPress={() => router.back()}>
        Back to log in
      </Text>
    </AuthShell>
  );
}
