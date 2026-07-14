import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import type { AppUser } from '@/constants/hardcoded-user';
import { theme } from '@/constants/theme';

interface UserOptionRowProps {
  user: AppUser;
  selected: boolean;
  onSelect: () => void;
}

export function UserOptionRow({ user, selected, onSelect }: UserOptionRowProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, selected && styles.rowSelected]}
      testID={`user-option-${user.id}`}
    >
      <UserAvatar name={user.displayName} size={44} />
      <View style={styles.textCol}>
        <Text style={styles.name}>{user.displayName}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  rowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
});
