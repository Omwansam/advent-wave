import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Touchable, type IconName } from './Buttons';
import { Text } from './Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
}

/** A bottom sheet: slides up over a dimmed screen, closes on the scrim or the system back. */
export function Sheet({ visible, onClose, children, header }: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.fill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          {header}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetItem({
  icon,
  label,
  onPress,
  tone,
  active,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'danger';
  active?: boolean;
}) {
  const t = useTheme();
  const color = tone === 'danger' ? t.danger : active ? t.primary : t.text;
  return (
    <Touchable onPress={onPress} accessibilityRole="button" style={styles.item}>
      <Ionicons name={icon} size={22} color={color} />
      <Text variant="body" style={{ color, flex: 1 }}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark" size={20} color={t.primary} /> : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 22, paddingVertical: 14 },
});
