import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { resolveUrl } from '@/lib/config';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  uri?: string | null;
  size: number;
  /** Corner radius; ignored when `round`. */
  radius?: number;
  round?: boolean;
  /** Shown when there is no picture: a note for songs, a mic for sermons, a person for artists. */
  icon?: IconName;
  style?: ViewStyle;
}

/** Artwork, cached on disk by expo-image, with a branded placeholder while it loads or when there is none. */
export function Cover({ uri, size, radius = 6, round = false, icon = 'musical-notes', style }: Props) {
  const t = useTheme();
  const r = round ? size / 2 : radius;
  const src = resolveUrl(uri);
  return (
    <View style={[{ width: size, height: size, borderRadius: r, overflow: 'hidden', backgroundColor: t.elevated }, style]}>
      <LinearGradient
        colors={[t.primarySoft, t.elevated]}
        style={[StyleSheet.absoluteFill, styles.center]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Ionicons name={icon} size={Math.max(14, size * 0.36)} color={t.muted} />
      </LinearGradient>
      {src ? (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={src}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
