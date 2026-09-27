import { router, useFocusEffect, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FeedPhoto } from '@/components/FeedPhoto';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { MessageBubble } from '@/components/MessageBubble';
import { useKeyboardInset } from '@/components/useKeyboardInset';
import { useMentionField } from '@/components/useMentionField';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import type { FeedPostReply, Member } from '@/lib/database.types';
import {
  canDeleteFeedPost,
  deleteFeedPost,
  formatFeedPostSubtitle,
  formatFeedPostTitle,
  type FeedPostSummary,
} from '@/lib/feed-posts';
import {
  buildFeedReplyPushPayload,
  canDeleteFeedPostReply,
  createOptimisticReply,
  deleteFeedPostReply,
  listFeedPostReplies,
  loadFeedPostById,
  mergeReplies,
  sendFeedPostReply,
  shouldSendFeedReplyPush,
  sortRepliesChronologically,
} from '@/lib/feed-post-replies';
import { subscribeToFeedPostReplyInserts } from '@/lib/feed-post-reply-realtime';
import { isLocalMode } from '@/lib/local-store';
import { shouldRefreshPostThreadOnNotification } from '@/lib/notification-refresh';
import { useNotificationRefresh } from '@/lib/use-notification-refresh';
import { formatRelativeTime } from '@/lib/time';
import { formatUserFacingError } from '@/lib/user-error';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

class PostReplySubscriptionBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function PostReplyLiveUpdates({
  postId,
  onInsert,
}: {
  postId: string;
  onInsert: (reply: FeedPostReply) => void;
}) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (isLocalMode()) return;
    try {
      return subscribeToFeedPostReplyInserts(postId, (reply) => {
        onInsertRef.current(reply);
      });
    } catch {
      return undefined;
    }
  }, [postId]);

  return null;
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={[sharedStyles.screen, styles.errorFallback]}>
      <Text style={styles.errorTitle}>This thread hit a connection error.</Text>
      <Text style={styles.errorBody}>The rest of GSL is still open. You can try the post again.</Text>
      <Pressable style={sharedStyles.primaryBtn} onPress={() => void retry()} testID="post-error-retry">
        <Text style={sharedStyles.primaryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

type ListRow =
  | { kind: 'header'; key: string }
  | { kind: 'reply'; key: string; reply: FeedPostReply }
  | { kind: 'empty'; key: string };

export default function PostThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuth();
  const keyboardInset = useKeyboardInset();
  const [post, setPost] = useState<FeedPostSummary | null>(null);
  const [replies, setReplies] = useState<FeedPostReply[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const mention = useMentionField(members);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const listRef = useRef<FlatList<ListRow>>(null);

  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));
  const avatarMap = Object.fromEntries(members.map((m) => [m.user_id, m.avatar_url]));

  const loadThread = useCallback(async () => {
    if (!id || !member) return;
    try {
      const [groupMembers, loadedPost, loadedReplies] = await Promise.all([
        getGroupMembers(member.group_id),
        loadFeedPostById(id),
        listFeedPostReplies(id),
      ]);
      setMembers(groupMembers);
      if (!loadedPost || loadedPost.group_id !== member.group_id) {
        setPost(null);
        setReplies([]);
        setMissing(true);
        return;
      }
      setMissing(false);
      setPost(loadedPost as FeedPostSummary);
      setReplies(sortRepliesChronologically(loadedReplies));
    } finally {
      setLoading(false);
    }
  }, [id, member]);

  useFocusEffect(
    useCallback(() => {
      void loadThread();
    }, [loadThread])
  );

  useNotificationRefresh(
    useCallback(
      (link) => typeof id === 'string' && shouldRefreshPostThreadOnNotification(link, id),
      [id]
    ),
    loadThread
  );

  useFocusEffect(
    useCallback(() => {
      if (!id || isLocalMode()) return undefined;
      const interval = setInterval(() => {
        void listFeedPostReplies(id).then((rows) => {
          setReplies((prev) => mergeReplies(prev, rows));
        });
      }, 8000);
      return () => clearInterval(interval);
    }, [id])
  );

  const handleInsert = useCallback((reply: FeedPostReply) => {
    setReplies((prev) => mergeReplies(prev, [reply]));
  }, []);

  const sendReply = async () => {
    if (!member || !id || !mention.body.trim()) return;
    const text = mention.body.trim();
    mention.setBody('');
    Keyboard.dismiss();

    const optimistic = createOptimisticReply(id, member.user_id, text);
    setReplies((prev) => mergeReplies(prev, [optimistic]));

    let saved: FeedPostReply;
    try {
      saved = await sendFeedPostReply(id, member.user_id, text);
      setReplies((prev) => mergeReplies(prev, [saved]));
    } catch {
      await loadThread();
      return;
    }

    if (isLocalMode()) return;

    try {
      const pushBody = buildFeedReplyPushPayload({
        groupId: member.group_id,
        authorId: member.user_id,
        authorName: member.display_name,
        text,
        postId: id,
        replyId: saved.id,
        members,
      });
      const audience = {
        userIds: pushBody.user_ids ?? null,
        tagNotification: pushBody.tag_notification,
      };
      if (!shouldSendFeedReplyPush(audience)) return;

      await supabase.functions.invoke('send-push', {
        body: pushBody,
      });
    } catch {
      // Push is best-effort; the reply is already persisted and shown.
    }
  };

  const handleDeletePost = async () => {
    if (!member || !post) return;
    try {
      await deleteFeedPost({
        postId: post.id,
        authorId: post.author_id,
        currentUserId: member.user_id,
        imagePath: post.image_path,
      });
      router.back();
    } catch (error) {
      Alert.alert('Could not delete', formatUserFacingError(error, 'Could not delete this post.'));
    }
  };

  const handleDeleteReply = async (reply: FeedPostReply) => {
    if (!member) return;
    try {
      await deleteFeedPostReply({
        replyId: reply.id,
        authorId: reply.author_id,
        currentUserId: member.user_id,
      });
      setReplies((prev) => prev.filter((row) => row.id !== reply.id));
    } catch (error) {
      Alert.alert('Could not delete', formatUserFacingError(error, 'Could not delete this reply.'));
    }
  };

  const liveUpdates =
    typeof id === 'string' && id.length > 0 ? (
      <PostReplySubscriptionBoundary>
        <PostReplyLiveUpdates postId={id} onInsert={handleInsert} />
      </PostReplySubscriptionBoundary>
    ) : null;

  if (loading || !member) {
    return (
      <>
        {liveUpdates}
        <Screen loading />
      </>
    );
  }

  if (missing || !post) {
    return (
      <>
        {liveUpdates}
        <Screen>
          <View style={styles.missing}>
            <Text style={styles.errorTitle}>Post not found</Text>
            <Pressable onPress={() => router.back()} testID="post-missing-back">
              <Text style={styles.closeText}>Back to Feed</Text>
            </Pressable>
          </View>
        </Screen>
      </>
    );
  }

  const canDeletePost = canDeleteFeedPost(post.author_id, member.user_id);
  const hasImage = Boolean(post.image_path || post.imageUri);
  const postTitle = formatFeedPostTitle(post.body, hasImage);
  const postSubtitle = formatFeedPostSubtitle(post, members);

  const rows: ListRow[] = [
    { kind: 'header', key: 'header' },
    ...(replies.length === 0
      ? ([{ kind: 'empty', key: 'empty' }] as ListRow[])
      : replies.map((reply) => ({ kind: 'reply' as const, key: reply.id, reply }))),
  ];

  return (
    <>
      {liveUpdates}
      <View style={[sharedStyles.screen, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.postCard} testID="post-thread-header">
                  <Text style={styles.postAuthor}>{memberMap[post.author_id] ?? 'Friend'}</Text>
                  <Text style={styles.postMeta}>
                    {postSubtitle} · {formatRelativeTime(post.created_at)}
                  </Text>
                  {postTitle ? <Text style={styles.postBody}>{postTitle}</Text> : null}
                  {post.imageUri ? (
                    <FeedPhoto uri={post.imageUri} style={styles.postImage} testID="post-thread-photo" />
                  ) : null}
                  {canDeletePost ? (
                    <Pressable
                      onPress={() => void handleDeletePost()}
                      testID="post-thread-delete"
                      accessibilityRole="button"
                      accessibilityLabel="Delete post"
                    >
                      <Text style={styles.deleteText}>Delete post</Text>
                    </Pressable>
                  ) : null}
                  <Text style={styles.threadLabel}>Thread</Text>
                </View>
              );
            }
            if (item.kind === 'empty') {
              return (
                <Text style={styles.emptyThread} testID="post-thread-empty">
                  Start the thread — reply below.
                </Text>
              );
            }
            const isOwn = item.reply.author_id === member.user_id;
            const canDeleteReply = canDeleteFeedPostReply(item.reply.author_id, member.user_id);
            return (
              <View style={styles.replyWrap} testID={`reply-row-${item.reply.id}`}>
                <MessageBubble
                  body={item.reply.body}
                  senderName={memberMap[item.reply.author_id] ?? 'Unknown'}
                  senderAvatarUrl={avatarMap[item.reply.author_id]}
                  createdAt={item.reply.created_at}
                  isOwn={isOwn}
                />
                {canDeleteReply ? (
                  <View
                    style={[
                      styles.replyDeleteRow,
                      isOwn ? styles.replyDeleteRowOwn : styles.replyDeleteRowOther,
                    ]}
                  >
                    <Pressable
                      onPress={() => void handleDeleteReply(item.reply)}
                      hitSlop={8}
                      testID={`delete-reply-${item.reply.id}`}
                      accessibilityRole="button"
                      accessibilityLabel="Delete reply"
                    >
                      <Text style={styles.replyDeleteText}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
        <View style={[styles.composer, keyboardInset > 0 && styles.composerAboveKeyboard]}>
          <MentionSuggestions
            suggestions={mention.suggestions}
            onSelect={mention.insertMention}
            testIDPrefix="reply"
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Reply… use @name to notify"
              placeholderTextColor={theme.colors.textMuted}
              {...mention.inputProps}
              testID="reply-input"
            />
            <Pressable style={styles.sendBtn} onPress={sendReply} testID="send-reply">
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  errorFallback: {
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  missing: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  list: { paddingBottom: theme.spacing.md },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  postAuthor: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  postMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  postBody: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
  },
  postImage: {
    borderRadius: theme.radius.md,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  threadLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyThread: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  replyWrap: {
    marginBottom: 2,
  },
  // Caption tucked under the bubble’s trailing edge (not a full-width action row).
  replyDeleteRow: {
    marginTop: -8,
    marginBottom: 2,
    paddingHorizontal: theme.spacing.lg,
  },
  replyDeleteRowOwn: {
    alignItems: 'flex-end',
  },
  replyDeleteRowOther: {
    // Match MessageBubble: avatar 28 + gap sm before the bubble.
    paddingLeft: theme.spacing.lg + 28 + theme.spacing.sm,
    alignItems: 'flex-start',
  },
  replyDeleteText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
  },
  closeText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  composer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    gap: theme.spacing.sm,
  },
  composerAboveKeyboard: {
    paddingBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  sendText: { color: theme.colors.onPrimary, fontWeight: '600', fontSize: 15 },
});
