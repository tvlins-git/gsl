import { StyleSheet, Text, View } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/constants/theme';
import { formatMessageTime } from '@/lib/messages';

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  createdAt: string;
  isOwn: boolean;
  /** Drop outer horizontal padding / use parent width — for rows that already inset the bubble. */
  compact?: boolean;
}

export function MessageBubble({
  body,
  senderName,
  senderAvatarUrl,
  createdAt,
  isOwn,
  compact = false,
}: MessageBubbleProps) {
  return (
    <View
      style={[
        styles.row,
        isOwn ? styles.ownRow : styles.otherRow,
        compact && styles.rowCompact,
      ]}
      testID="message-bubble"
    >
      {!isOwn ? <UserAvatar name={senderName} size={28} imageUri={senderAvatarUrl} /> : null}
      <View
        style={[
          styles.bubble,
          compact && styles.bubbleCompact,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {!isOwn ? <Text style={styles.senderName}>{senderName}</Text> : null}
        <Text style={[styles.body, isOwn && styles.ownBody]}>{body}</Text>
        <Text style={[styles.time, isOwn && styles.ownTime]}>
          {formatMessageTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  rowCompact: {
    paddingHorizontal: 0,
    marginVertical: 2,
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleCompact: {
    // Parent row already reserves space for Delete; use nearly full col width.
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
  },
  ownBody: {
    color: theme.colors.onPrimary,
  },
  time: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  ownTime: {
    color: 'rgba(255,255,255,0.55)',
  },
});
