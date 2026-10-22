import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

/** The frame of the sign-in screens: the brand mark over a wash of the brand colours. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient colors={['rgba(109,93,246,0.45)', 'rgba(201,162,39,0.12)', t.bg]} style={styles.wash} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
          <View style={[styles.mark, { backgroundColor: t.primary }]}>
            <Ionicons name="musical-notes" size={34} color="#ffffff" />
          </View>
          <Text variant="label" tone="gold" style={styles.center}>
            AdventWave
          </Text>
          <Text variant="display" style={[styles.center, { marginTop: 6 }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted" style={[styles.center, { marginTop: 8 }]}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  ref?: Ref<TextInputInstance>;
}

export function Field({ label, error, style, ref, ...rest }: FieldProps) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={t.muted}
        {...rest}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.surface, borderColor: error ? t.danger : t.border },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={[styles.error, { borderColor: t.danger, backgroundColor: 'rgba(229,72,77,0.08)' }]}>
      <Ionicons name="alert-circle" size={18} color={t.danger} />
      <Text variant="caption" style={{ flex: 1, color: t.text }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  content: { paddingHorizontal: 24, flexGrow: 1, maxWidth: 480, width: '100%', alignSelf: 'center' },
  mark: { alignSelf: 'center', width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  center: { textAlign: 'center' },
  form: { marginTop: 32, gap: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12 },
});
