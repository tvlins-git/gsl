import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { UserAvatar } from '@/components/UserAvatar';
import { formatMessageTime } from '@/lib/messages';
import { theme } from '@/constants/theme';

type Props = {
  body: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
  isOwn: boolean;
  onDelete?: () => void;
  testID?: string;
};

/**
 * Feed-thread reply row: always shows avatar + name so readers can tell who
 * answered. Own replies swipe left to Delete (same pattern as Feed posts).
 */
export function FeedReplyRow({
  body,
  authorName,
  authorAvatarUrl,
  createdAt,
  isOwn,
  onDelete,
  testID = 'feed-reply-row',
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const row = (
    <View style={styles.row} testID={testID}>
      <UserAvatar name={authorName} size={32} imageUri={authorAvatarUrl} />
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {authorName}
          </Text>
          {isOwn ? <Text style={styles.you}>You</Text> : null}
        </View>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.time}>{formatMessageTime(createdAt)}</Text>
      </View>
    </View>
  );

  if (!onDelete || !isOwn) {
    return <View style={styles.wrap}>{row}</View>;
  }

  return (
    <View style={styles.wrap}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        enableTrackpadTwoFingerGesture
        renderRightActions={(_progress, _drag, swipeable) => (
          <Pressable
            style={styles.deleteAction}
            onPress={() => {
              (swipeable ?? swipeableRef.current)?.close();
              onDelete();
            }}
            testID={`${testID}-delete`}
            accessibilityRole="button"
            accessibilityLabel="Delete reply"
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </Pressable>
        )}
      >
        {row}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  you: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  body: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 21,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  deleteAction: {
    width: 88,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
