import { Pressable, StyleSheet, Text, View } from 'react-native';
import { activityKindLabel, type ActivityItem as ActivityItemData } from '@/lib/activity-feed';
import { formatRelativeTime } from '@/lib/time';
import { theme } from '@/constants/theme';

interface ActivityItemProps {
  item: ActivityItemData;
  onPress: () => void;
}

export function ActivityItem({ item, onPress }: ActivityItemProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      testID={`feed-item-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${activityKindLabel(item.kind)}: ${item.title}`}
    >
      <View style={[styles.kind, item.kind === 'plan_lock' && styles.kindLocked]}>
        <Text style={[styles.kindText, item.kind === 'plan_lock' && styles.kindLockedText]}>
          {activityKindLabel(item.kind)}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.subtitle} · {item.authorName} · {formatRelativeTime(item.timestamp)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  kind: {
    minWidth: 58,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
  },
  kindLocked: {
    backgroundColor: theme.colors.successSoft,
  },
  kindText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  kindLockedText: {
    color: theme.colors.success,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
