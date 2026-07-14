import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface UserAvatarProps {
  name: string;
  size?: number;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function UserAvatar({ name, size = 48 }: UserAvatarProps) {
  const fontSize = size * 0.36;

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  initials: {
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
});
