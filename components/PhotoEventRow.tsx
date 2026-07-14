import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PhotoEventSummary } from '@/lib/photo-events';
import { formatEventDate, formatPhotoCount } from '@/lib/photo-events';
import { sharedStyles, theme } from '@/constants/theme';

interface PhotoEventRowProps {
  summary: PhotoEventSummary;
  selected?: boolean;
  onPress: () => void;
}

export function PhotoEventRow({ summary, selected, onPress }: PhotoEventRowProps) {
  const { event, photoCount } = summary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, sharedStyles.card, selected && styles.rowSelected]}
      testID={`photo-event-${event.id}`}
    >
      <View style={styles.main}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          Added {formatEventDate(event.created_at)} · {formatPhotoCount(photoCount)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  rowSelected: {
    borderColor: theme.colors.primary,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
  },
});
