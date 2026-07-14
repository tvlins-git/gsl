import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PhotoEventSummary } from '@/lib/photo-events';
import { formatEventDate, formatPhotoCount } from '@/lib/photo-events';
import { sharedStyles, theme } from '@/constants/theme';

interface PhotoEventRowProps {
  summary: PhotoEventSummary;
  selected?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

export function PhotoEventRow({ summary, selected, onPress, onDelete }: PhotoEventRowProps) {
  const { event, photoCount } = summary;

  return (
    <View style={[styles.row, sharedStyles.card, selected && styles.rowSelected]}>
      <Pressable
        style={styles.main}
        onPress={onPress}
        testID={`photo-event-${event.id}`}
      >
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          Added {formatEventDate(event.created_at)} · {formatPhotoCount(photoCount)}
        </Text>
      </Pressable>
      {onDelete && (
        <Pressable
          style={styles.deleteBtn}
          onPress={onDelete}
          testID={`delete-photo-event-${event.id}`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  rowSelected: {
    borderColor: theme.colors.primary,
  },
  main: {
    flex: 1,
    padding: theme.spacing.lg,
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
  deleteBtn: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});
