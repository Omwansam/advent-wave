import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'caption' | 'label';

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
};

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'primary' | 'gold' | 'danger' | 'onPrimary';
}

export function Text({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  const t = useTheme();
  const color = {
    default: t.text,
    muted: t.muted,
    primary: t.primary,
    gold: t.gold,
    danger: t.danger,
    onPrimary: t.onPrimary,
  }[tone];
  return <RNText {...rest} style={[VARIANTS[variant], { color }, style]} />;
}
