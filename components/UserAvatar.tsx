import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { getInitials } from '@/lib/display-name';

interface UserAvatarProps {
  name: string;
  size?: number;
  imageUri?: string | null;
  ring?: boolean;
}

const PALETTE = [
  { bg: '#e8e8e8', fg: '#111111' },
  { bg: '#d4d4d4', fg: '#111111' },
  { bg: '#c4c4c4', fg: '#111111' },
  { bg: '#111111', fg: '#ffffff' },
  { bg: '#3a3a3a', fg: '#ffffff' },
  { bg: '#6b6b6b', fg: '#ffffff' },
] as const;

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function UserAvatar({ name, size = 48, imageUri, ring = false }: UserAvatarProps) {
  const fontSize = size * 0.36;
  const palette = colorForName(name || '?');
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  const inner = size - ringWidth * 2;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: ringWidth,
          backgroundColor: ring ? theme.colors.storyRing : 'transparent',
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              backgroundColor: palette.bg,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: palette.fg }]}>
            {getInitials(name || '?')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
