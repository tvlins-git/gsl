import { StyleSheet, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/constants/theme';

export type AvatarStackPerson = {
  name: string;
  imageUri?: string | null;
};

interface AvatarStackProps {
  names?: string[];
  people?: AvatarStackPerson[];
  size?: number;
  max?: number;
}

export function AvatarStack({ names, people, size = 28, max = 3 }: AvatarStackProps) {
  const source: AvatarStackPerson[] =
    people ?? (names ?? []).map((name) => ({ name, imageUri: null }));
  const shown = source.filter((person) => Boolean(person.name)).slice(0, max);
  if (shown.length === 0) return null;

  const overlap = Math.round(size * 0.36);

  return (
    <View style={[styles.row, { height: size }]} testID="avatar-stack">
      {shown.map((person, index) => (
        <View
          key={`${person.name}-${index}`}
          style={[
            styles.item,
            {
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: shown.length - index,
              borderRadius: size / 2,
            },
          ]}
        >
          <UserAvatar name={person.name} size={size} imageUri={person.imageUri} />
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
