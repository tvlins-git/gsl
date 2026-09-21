import { StyleSheet, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/constants/theme';

interface AvatarStackProps {
  names: string[];
  size?: number;
  max?: number;
}

export function AvatarStack({ names, size = 28, max = 3 }: AvatarStackProps) {
  const shown = names.filter(Boolean).slice(0, max);
  if (shown.length === 0) return null;

  const overlap = Math.round(size * 0.36);

  return (
    <View style={[styles.row, { height: size }]} testID="avatar-stack">
      {shown.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={[
            styles.item,
            {
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: shown.length - index,
              borderRadius: size / 2,
            },
          ]}
        >
          <UserAvatar name={name} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    borderWidth: 2,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
});
