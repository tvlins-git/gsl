import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { MessageBubble } from '@/components/MessageBubble';
import { useMentionField } from '@/components/useMentionField';
import { UserAvatar } from '@/components/UserAvatar';
import type { FeedPostReply, Member } from '@/lib/database.types';
import { canDeleteFeedPostReply } from '@/lib/feed-post-replies';
import { theme } from '@/constants/theme';

type Props = {
  postId: string;
  replies: FeedPostReply[];
  loading: boolean;
  members: Member[];
  currentUserId: string;
  onSend: (body: string) => Promise<void> | void;
  onDeleteReply?: (reply: FeedPostReply) => void;
  onOpenFullThread?: () => void;
  testID?: string;
};

export function FeedInlineThread({
  postId,
  replies,
  loading,
  members,
  currentUserId,
  onSend,
  onDeleteReply,
  onOpenFullThread,
  testID = `feed-inline-thread-${postId}`,
}: Props) {
  const mention = useMentionField(members);
  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));
  const avatarMap = Object.fromEntries(members.map((m) => [m.user_id, m.avatar_url]));

  const send = async () => {
    const text = mention.body.trim();
    if (!text) return;
    mention.setBody('');
    await onSend(text);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      {loading ? (
        <ActivityIndicator style={styles.loading} testID={`${testID}-loading`} />
      ) : replies.length === 0 ? (
        <Text style={styles.empty} testID={`${testID}-empty`}>
          No replies yet — be the first.
        </Text>
      ) : (
        replies.map((reply) => {
          const isOwn = reply.author_id === currentUserId;
          const canDelete =
            Boolean(onDeleteReply) && canDeleteFeedPostReply(reply.author_id, currentUserId);
          return (
            <View
              key={reply.id}
              style={[styles.replyRow, isOwn ? styles.replyRowOwn : styles.replyRowOther]}
            >
              <View style={styles.replyBubbleCol}>
                <MessageBubble
                  body={reply.body}
                  senderName={memberMap[reply.author_id] ?? 'Unknown'}
                  senderAvatarUrl={avatarMap[reply.author_id]}
                  createdAt={reply.created_at}
                  isOwn={isOwn}
                  compact
                />
              </View>
              {canDelete ? (
                <Pressable
                  onPress={() => onDeleteReply?.(reply)}
                  hitSlop={8}
                  style={styles.replyDelete}
                  testID={`inline-delete-reply-${reply.id}`}
                  accessibilityRole="button"
                  accessibilityLabel="Delete reply"
                >
                  <Text style={styles.replyDeleteText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}

      <View style={styles.composer}>
        <MentionSuggestions
          suggestions={mention.suggestions}
          onSelect={mention.insertMention}
          testIDPrefix={`inline-reply-${postId}`}
        />
        <View style={styles.inputRow}>
          <UserAvatar
            name={memberMap[currentUserId] ?? 'You'}
            size={28}
            imageUri={avatarMap[currentUserId]}
          />
          <TextInput
            style={styles.input}
            placeholder="Write a reply…"
            placeholderTextColor={theme.colors.textMuted}
            {...mention.inputProps}
            testID={`${testID}-input`}
          />
          <Pressable style={styles.sendBtn} onPress={() => void send()} testID={`${testID}-send`}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
        {onOpenFullThread ? (
          <Pressable
            onPress={onOpenFullThread}
            testID={`${testID}-open-full`}
            accessibilityRole="button"
            accessibilityLabel="Open full thread"
          >
            <Text style={styles.openFull}>Open full thread</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  loading: {
    paddingVertical: theme.spacing.md,
  },
  empty: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  replyRowOwn: {
    justifyContent: 'flex-end',
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  replyRowOther: {
    justifyContent: 'flex-start',
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.md,
  },
  replyBubbleCol: {
    flexShrink: 1,
    maxWidth: '90%',
  },
  replyDelete: {
    paddingTop: 10,
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  replyDeleteText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
  },
  composer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  openFull: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
});
