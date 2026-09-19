import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface UserAvatarProps {
  name: string;
  size?: number;
  imageUri?: string | null;
  ring?: boolean;
}

const PALETTE = [
  { bg: '#fde8e2', fg: '#d4543c' },
  { bg: '#fce8d5', fg: '#c46a2a' },
  { bg: '#e7f2e4', fg: '#3f7a4e' },
  { bg: '#e4eaf8', fg: '#4a5fa0' },
  { bg: '#f5e4f0', fg: '#8a4a7a' },
  { bg: '#e4f3f3', fg: '#3d7a7a' },
] as const;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

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
