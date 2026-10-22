import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { describeError } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, type IconName } from './Buttons';
import { Text } from './Text';

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator color={t.primary} size="large" />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={t.muted} />
      <Text variant="subheading" style={styles.text}>
        Something went wrong
      </Text>
      <Text variant="caption" tone="muted" style={styles.text}>
        {describeError(error)}
      </Text>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} compact style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: { title: string; onPress: () => void };
}) {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={t.muted} />
      <Text variant="subheading" style={styles.text}>
        {title}
      </Text>
      {body ? (
        <Text variant="caption" tone="muted" style={styles.text}>
          {body}
        </Text>
      ) : null}
      {action ? <Button title={action.title} onPress={action.onPress} compact style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  text: { textAlign: 'center', maxWidth: 300 },
});
