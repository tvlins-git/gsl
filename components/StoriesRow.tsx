import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { firstName } from '@/lib/time';
import type { Member } from '@/lib/database.types';
import { theme } from '@/constants/theme';

interface StoriesRowProps {
  members: Member[];
  highlightIds?: Set<string>;
  onPressMember?: (member: Member) => void;
}

export function StoriesRow({ members, highlightIds, onPressMember }: StoriesRowProps) {
  if (members.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      testID="stories-row"
    >
      {members.map((member) => {
        const highlighted = highlightIds?.has(member.id) ?? false;
        const inner = (
          <View style={styles.item}>
            <UserAvatar
              name={member.display_name}
              size={64}
              imageUri={member.avatar_url}
              ring={highlighted}
            />
            <Text style={styles.name} numberOfLines={1}>
              {firstName(member.display_name)}
            </Text>
          </View>
        );

        if (!onPressMember) {
          return <View key={member.id}>{inner}</View>;
        }

        return (
          <Pressable
            key={member.id}
            onPress={() => onPressMember(member)}
            accessibilityRole="button"
            accessibilityLabel={member.display_name}
          >
            {inner}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    minHeight: 96,
  },
  row: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    width: '100%',
  },
});
