import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Keyboard, StyleSheet, Text } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
import { FeedComposer } from '@/components/FeedComposer';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import {
  buildActivityItems,
  loadActivitySources,
  type ActivityItem as ActivityItemData,
} from '@/lib/activity-feed';
import type { Member } from '@/lib/database.types';
import { canDeleteFeedPost, deleteFeedPost } from '@/lib/feed-posts';
import { canDeleteHostAssignment, deleteHostAssignment } from '@/lib/host-assignments';
import { shouldRefreshFeedOnNotification } from '@/lib/notification-refresh';
import { useNotificationRefresh } from '@/lib/use-notification-refresh';
import { formatUserFacingError } from '@/lib/user-error';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function FeedScreen() {
  const { member } = useAuth();
  const [items, setItems] = useState<ActivityItemData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeletePost = async (item: ActivityItemData) => {
    if (!member || !item.sourceId || !item.authorId) return;
    try {
      await deleteFeedPost({
        postId: item.sourceId,
        authorId: item.authorId,
        currentUserId: member.user_id,
        imagePath: item.imagePath,
      });
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
        renderItem={({ item }) => (
          <ActivityItem
            item={item}
            onPress={() => {
              Keyboard.dismiss();
              router.push(item.path as Href);
            }}
            onDelete={feedItemOnDelete(item)}
          />
        )}
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
