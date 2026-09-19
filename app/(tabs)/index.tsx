import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
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
import { generateMonthList } from '@/lib/hosts';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function FeedScreen() {
  const { member } = useAuth();
  const [items, setItems] = useState<ActivityItemData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hostAssignments, setHostAssignments] = useState<HostAssignment[]>([]);
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

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <StoriesRow members={members} highlightIds={highlightIds} />
            <View style={styles.shortcuts}>
              <Pressable
                style={styles.shortcut}
                onPress={() => router.push('/photos')}
                testID="feed-shortcut-photos"
              >
                <Text style={styles.shortcutText}>See albums</Text>
              </Pressable>
              <Pressable
                style={styles.shortcut}
                onPress={() => router.push('/plan')}
                testID="feed-shortcut-plan"
              >
                <Text style={styles.shortcutText}>Open polls</Text>
              </Pressable>
              <Pressable
                style={styles.shortcut}
                onPress={() => router.push('/hosts')}
                testID="feed-shortcut-hosts"
              >
                <Text style={styles.shortcutText}>Hosts</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ActivityItem item={item} onPress={() => router.push(item.path as Href)} />
        )}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>
            Nothing on the feed yet. New albums, photo drops, locked dates, and chats will show up
            here.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    ...feedColumn,
    paddingBottom: theme.spacing.xxl,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  shortcut: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
