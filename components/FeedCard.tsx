import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { formatRelativeTime } from '@/lib/time';
import { theme, shadow } from '@/constants/theme';

interface FeedCardProps {
  authorName: string;
  title: string;
  timestamp: string;
  caption?: string;
  imageUri?: string | null;
  badge?: string;
  onPress: () => void;
  onDelete?: () => void;
  testID?: string;
  deleteTestID?: string;
}

export function FeedCard({
  authorName,
  title,
  timestamp,
  caption,
  imageUri,
  badge,
  onPress,
  onDelete,
  testID,
  deleteTestID,
}: FeedCardProps) {
  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.header}>
        <Pressable style={styles.headerMain} onPress={onPress} testID={testID}>
          <UserAvatar name={authorName} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.author} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatRelativeTime(timestamp)}
              {badge ? ` · ${badge}` : ''}
            </Text>
          </View>
        </Pressable>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} testID={deleteTestID}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={onPress}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderMark}>{title.slice(0, 1).toUpperCase() || '·'}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  author: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.borderLight,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderMark: {
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.primary,
    opacity: 0.35,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  caption: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
