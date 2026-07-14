import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { formatMessageTime } from '@/lib/messages';

interface MessageBubbleProps {
  body: string;
  senderName: string;
  createdAt: string;
  isOwn: boolean;
}

export function MessageBubble({ body, senderName, createdAt, isOwn }: MessageBubbleProps) {
  return (
    <View
      style={[styles.row, isOwn ? styles.ownRow : styles.otherRow]}
      testID="message-bubble"
    >
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.senderName, isOwn && styles.ownSenderName]}>{senderName}</Text>
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
  },
  ownRow: {
    alignItems: 'flex-end',
  },
  otherRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.radius.sm,
  },
  otherBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  ownSenderName: {
    color: 'rgba(255,255,255,0.7)',
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
