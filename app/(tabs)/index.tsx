import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
import { FeedComposer } from '@/components/FeedComposer';
import { StoriesRow } from '@/components/StoriesRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import {
  buildActivityItems,
  loadActivitySources,
  type ActivityItem as ActivityItemData,
} from '@/lib/activity-feed';
import type { HostAssignment, Member } from '@/lib/database.types';
import { canDeleteFeedPost, deleteFeedPost } from '@/lib/feed-posts';
import { generateMonthList } from '@/lib/hosts';
import { formatRelativeTime } from '@/lib/time';
import { formatUserFacingError } from '@/lib/user-error';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function FeedScreen() {
  const { member } = useAuth();
  const [items, setItems] = useState<ActivityItemData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hostAssignments, setHostAssignments] = useState<HostAssignment[]>([]);
  const [selectedPost, setSelectedPost] = useState<ActivityItemData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    if (!member) return;
    const [groupMembers, sources] = await Promise.all([
      getGroupMembers(member.group_id),
      loadActivitySources(member.group_id),
    ]);
    setMembers(groupMembers);
    setHostAssignments(sources.hostAssignments);
    setItems(
      buildActivityItems({
        members: groupMembers,
        photoEvents: sources.photoEvents,
        polls: sources.polls,
        threads: sources.threads,
        hostAssignments: sources.hostAssignments,
        feedPosts: sources.feedPosts,
      })
    );
    setLoading(false);
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed])
  );

  const highlightIds = useMemo(() => {
    const current = generateMonthList(1)[0];
    const hostId = current
      ? hostAssignments.find((row) => row.year === current.year && row.month === current.month)
          ?.assigned_member_id
      : null;
    return new Set(hostId ? [hostId] : []);
  }, [hostAssignments]);

  const handleDeletePost = async (item: ActivityItemData) => {
    if (!member || !item.sourceId || !item.authorId) return;
    try {
      await deleteFeedPost({
        postId: item.sourceId,
        authorId: item.authorId,
        currentUserId: member.user_id,
        imagePath: item.imagePath,
      });
      if (selectedPost?.id === item.id) setSelectedPost(null);
      await loadFeed();
    } catch (error) {
      Alert.alert('Could not delete', formatUserFacingError(error, 'Could not delete this post.'));
    }
  };

  if (loading || !member) {
    return <Screen loading />;
  }

  const canDeleteSelected =
    selectedPost != null && canDeleteFeedPost(selectedPost.authorId, member.user_id);

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <StoriesRow members={members} highlightIds={highlightIds} />
            <FeedComposer members={members} author={member} onPosted={loadFeed} />
          </View>
        }
        renderItem={({ item }) => (
          <ActivityItem
            item={item}
            onPress={() => {
              if (item.kind === 'post') {
                setSelectedPost(item);
                return;
              }
              router.push(item.path as Href);
            }}
            onDelete={
              item.kind === 'post' && canDeleteFeedPost(item.authorId, member.user_id)
                ? () => {
                    void handleDeletePost(item);
                  }
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>
            Share an update, or wait for albums, polls, and chats to show up here.
          </Text>
        }
      />

      <Modal
        visible={selectedPost != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <Pressable style={sharedStyles.modalOverlay} onPress={() => setSelectedPost(null)}>
          <Pressable style={sharedStyles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={sharedStyles.modalTitle}>{selectedPost?.authorName}</Text>
            <Text style={styles.postMeta}>
              {selectedPost?.subtitle}
              {selectedPost ? ` · ${formatRelativeTime(selectedPost.timestamp)}` : ''}
            </Text>
            {selectedPost?.title ? <Text style={styles.postBody}>{selectedPost.title}</Text> : null}
            {selectedPost?.imageUri ? (
              <Image
                source={{ uri: selectedPost.imageUri }}
                style={styles.postImage}
                resizeMode="cover"
                testID="feed-post-detail-photo"
              />
            ) : null}
            {canDeleteSelected && selectedPost ? (
              <Pressable
                onPress={() => {
                  void handleDeletePost(selectedPost);
                }}
                testID="feed-post-delete"
                accessibilityRole="button"
                accessibilityLabel="Delete post"
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setSelectedPost(null)} testID="feed-post-close">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    ...feedColumn,
    paddingBottom: theme.spacing.xxl,
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
    width: '100%',
    height: 280,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.borderLight,
  },
  deleteText: {
    textAlign: 'center',
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: theme.spacing.sm,
  },
  closeText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: theme.spacing.sm,
  },
});
