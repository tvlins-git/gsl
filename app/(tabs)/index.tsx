import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Keyboard, StyleSheet, Text } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
import { FeedComposer } from '@/components/FeedComposer';
import { FeedInlineThread } from '@/components/FeedInlineThread';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import {
  buildActivityItems,
  loadActivitySources,
  type ActivityItem as ActivityItemData,
} from '@/lib/activity-feed';
import type { FeedPostReply, Member } from '@/lib/database.types';
import { canDeleteFeedPost, deleteFeedPost } from '@/lib/feed-posts';
import {
  buildFeedReplyPushPayload,
  createOptimisticReply,
  deleteFeedPostReply,
  listFeedPostReplies,
  mergeReplies,
  sendFeedPostReply,
  shouldSendFeedReplyPush,
  sortRepliesChronologically,
} from '@/lib/feed-post-replies';
import { canDeleteHostAssignment, deleteHostAssignment } from '@/lib/host-assignments';
import { isLocalMode } from '@/lib/local-store';
import { shouldRefreshFeedOnNotification } from '@/lib/notification-refresh';
import { useNotificationRefresh } from '@/lib/use-notification-refresh';
import { formatUserFacingError } from '@/lib/user-error';
import { supabase } from '@/lib/supabase';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function FeedScreen() {
  const { member } = useAuth();
  const [items, setItems] = useState<ActivityItemData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, FeedPostReply[]>>({});
  const [threadLoading, setThreadLoading] = useState<Record<string, boolean>>({});

  const loadFeed = useCallback(async () => {
    if (!member) return;
    const [groupMembers, sources] = await Promise.all([
      getGroupMembers(member.group_id),
      loadActivitySources(member.group_id),
    ]);
    setMembers(groupMembers);
    setItems(
      buildActivityItems({
        members: groupMembers,
        photoEvents: sources.photoEvents,
        polls: sources.polls,
        threads: sources.threads,
        hostAssignments: sources.hostAssignments,
        feedPosts: sources.feedPosts,
        replyCounts: sources.replyCounts,
      })
    );
    setLoading(false);
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed])
  );

  useNotificationRefresh(shouldRefreshFeedOnNotification, loadFeed);

  const loadThread = useCallback(async (postId: string) => {
    setThreadLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const replies = sortRepliesChronologically(await listFeedPostReplies(postId));
      setThreadReplies((prev) => ({ ...prev, [postId]: replies }));
    } catch (error) {
      Alert.alert('Could not load thread', formatUserFacingError(error, 'Could not load replies.'));
    } finally {
      setThreadLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const toggleThread = useCallback(
    (postId: string) => {
      Keyboard.dismiss();
      setExpandedPostId((current) => {
        if (current === postId) return null;
        void loadThread(postId);
        return postId;
      });
    },
    [loadThread]
  );

  const bumpReplyCount = (postId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind !== 'post' || item.sourceId !== postId) return item;
        return { ...item, replyCount: Math.max(0, (item.replyCount ?? 0) + delta) };
      })
    );
  };

  const handleSendInlineReply = async (postId: string, text: string) => {
    if (!member) return;
    const optimistic = createOptimisticReply(postId, member.user_id, text);
    setThreadReplies((prev) => ({
      ...prev,
      [postId]: mergeReplies(prev[postId] ?? [], [optimistic]),
    }));
    bumpReplyCount(postId, 1);

    let saved: FeedPostReply;
    try {
      saved = await sendFeedPostReply(postId, member.user_id, text);
      setThreadReplies((prev) => ({
        ...prev,
        [postId]: mergeReplies(prev[postId] ?? [], [saved]),
      }));
    } catch (error) {
      bumpReplyCount(postId, -1);
      await loadThread(postId);
      Alert.alert('Could not reply', formatUserFacingError(error, 'Could not send reply.'));
      return;
    }

    if (isLocalMode()) return;

    try {
      const pushBody = buildFeedReplyPushPayload({
        groupId: member.group_id,
        authorId: member.user_id,
        authorName: member.display_name,
        text,
        postId,
        replyId: saved.id,
        members,
      });
      const audience = {
        userIds: pushBody.user_ids ?? null,
        tagNotification: pushBody.tag_notification,
      };
      if (!shouldSendFeedReplyPush(audience)) return;
      await supabase.functions.invoke('send-push', { body: pushBody });
    } catch {
      // Push is best-effort.
    }
  };

  const handleDeleteInlineReply = async (postId: string, reply: FeedPostReply) => {
    if (!member) return;
    try {
      await deleteFeedPostReply({
        replyId: reply.id,
        authorId: reply.author_id,
        currentUserId: member.user_id,
      });
      setThreadReplies((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((row) => row.id !== reply.id),
      }));
      bumpReplyCount(postId, -1);
    } catch (error) {
      Alert.alert('Could not delete', formatUserFacingError(error, 'Could not delete this reply.'));
    }
  };

  const handleDeletePost = async (item: ActivityItemData) => {
    if (!member || !item.sourceId || !item.authorId) return;
    try {
      await deleteFeedPost({
        postId: item.sourceId,
        authorId: item.authorId,
        currentUserId: member.user_id,
        imagePath: item.imagePath,
      });
      if (expandedPostId === item.sourceId) setExpandedPostId(null);
      await loadFeed();
    } catch (error) {
      Alert.alert('Could not delete', formatUserFacingError(error, 'Could not delete this post.'));
    }
  };

  const handleDeleteHost = async (item: ActivityItemData) => {
    if (!member || !item.sourceId || !item.authorId) return;
    try {
      await deleteHostAssignment({
        assignmentId: item.sourceId,
        updatedBy: item.authorId,
        currentUserId: member.user_id,
      });
      await loadFeed();
    } catch (error) {
      Alert.alert(
        'Could not delete',
        formatUserFacingError(error, 'Could not delete this host assignment.')
      );
    }
  };

  const feedItemOnDelete = (item: ActivityItemData) => {
    if (!member) return undefined;
    if (item.kind === 'post' && canDeleteFeedPost(item.authorId, member.user_id)) {
      return () => {
        Keyboard.dismiss();
        void handleDeletePost(item);
      };
    }
    if (item.kind === 'host' && canDeleteHostAssignment(item.authorId, member.user_id)) {
      return () => {
        Keyboard.dismiss();
        void handleDeleteHost(item);
      };
    }
    return undefined;
  };

  if (loading || !member) {
    return <Screen loading />;
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        ListHeaderComponent={
          <FeedComposer members={members} author={member} onPosted={loadFeed} />
        }
        renderItem={({ item }) => {
          const postId = item.sourceId;
          const isPost = item.kind === 'post' && postId;
          const expanded = Boolean(isPost && expandedPostId === postId);

          return (
            <ActivityItem
              item={item}
              onPress={() => {
                Keyboard.dismiss();
                router.push(item.path as Href);
              }}
              onDelete={feedItemOnDelete(item)}
              threadExpanded={expanded}
              onToggleThread={
                isPost
                  ? () => {
                      toggleThread(postId);
                    }
                  : undefined
              }
              threadPanel={
                expanded && isPost ? (
                  <FeedInlineThread
                    postId={postId}
                    replies={threadReplies[postId] ?? []}
                    loading={Boolean(threadLoading[postId])}
                    members={members}
                    currentUserId={member.user_id}
                    onSend={(body) => handleSendInlineReply(postId, body)}
                    onDeleteReply={(reply) => void handleDeleteInlineReply(postId, reply)}
                    onOpenFullThread={() => router.push(`/post/${postId}` as Href)}
                  />
                ) : null
              }
            />
          );
        }}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>
            Share an update, or wait for albums, polls, and chats to show up here.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    ...feedColumn,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
});
