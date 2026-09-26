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
}

export function MessageBubble({
  body,
  senderName,
  senderAvatarUrl,
  createdAt,
  isOwn,
}: MessageBubbleProps) {
  return (
    <View
      style={[styles.row, isOwn ? styles.ownRow : styles.otherRow]}
      testID="message-bubble"
    >
      {!isOwn ? <UserAvatar name={senderName} size={28} imageUri={senderAvatarUrl} /> : null}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
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
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '76%',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
