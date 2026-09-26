import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AvatarStack } from '@/components/AvatarStack';
import { KeyboardSheet } from '@/components/KeyboardSheet';
import { PollThreadLink } from '@/components/PollThreadLink';
import { UserAvatar } from '@/components/UserAvatar';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import type { Member, Thread } from '@/lib/database.types';
import { formatRelativeTime } from '@/lib/time';
import { isLocalMode, localStore } from '@/lib/local-store';
import { loadPollTitles } from '@/lib/poll-thread';
import { deleteThread } from '@/lib/thread-list';
import { supabase } from '@/lib/supabase';
import { feedColumn, sharedStyles, theme } from '@/constants/theme';

export default function ChatScreen() {
  const { member } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [lastMessages, setLastMessages] = useState<
    Record<string, { body: string; created_at: string; sender_id: string }>
  >({});
  const [pollTitles, setPollTitles] = useState<Record<string, string>>({});

  const loadThreads = useCallback(async () => {
    if (!member) return;
    const data = isLocalMode()
      ? await localStore.getThreads(member.group_id)
      : (await supabase.from('threads').select('*').eq('group_id', member.group_id).order('created_at', { ascending: false })).data ?? [];
    setThreads(data);
    const titlesPromise = loadPollTitles(
      data.map((thread) => thread.poll_id).filter((pollId): pollId is string => !!pollId),
      member.group_id
    );
    setMembers(await getGroupMembers(member.group_id));

    const msgs: Record<string, { body: string; created_at: string; sender_id: string }> = {};
    for (const t of data) {
      const threadMsgs = isLocalMode()
        ? await localStore.getMessages(t.id)
        : (await supabase.from('messages').select('body, created_at, sender_id').eq('thread_id', t.id).order('created_at', { ascending: false }).limit(1)).data ?? [];
      const m = isLocalMode() ? threadMsgs[threadMsgs.length - 1] : threadMsgs[0];
      if (m) msgs[t.id] = { body: m.body, created_at: m.created_at, sender_id: m.sender_id };
    }
    setLastMessages(msgs);
    setPollTitles(await titlesPromise);
    setLoading(false);
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void loadThreads();
    }, [loadThreads])
  );

  const handleCreateThread = async () => {
    if (!member || !newName.trim()) return;

    const thread = isLocalMode()
      ? await localStore.createThread(member.group_id, newName.trim(), member.user_id)
      : (await supabase
          .from('threads')
          .insert({ group_id: member.group_id, name: newName.trim(), created_by: member.user_id })
          .select()
          .single()).data;

    if (thread) {
      if (!isLocalMode()) {
        const { data: members } = await supabase.from('members').select('id').eq('group_id', member.group_id);
        await supabase.from('thread_members').insert(
          (members ?? []).map((m) => ({ thread_id: thread.id, member_id: m.id }))
        );
      }
      router.push(`/thread/${thread.id}`);
    }

    setShowCreate(false);
    setNewName('');
    await loadThreads();
  };

  const handleDeleteThread = async (threadId: string) => {
    await deleteThread(threadId);
    await loadThreads();
  };

  if (loading && threads.length === 0) {
    return <Screen loading />;
  }

  const nameForUser = (userId?: string) =>
    members.find((item) => item.user_id === userId)?.display_name
    ?? (member && userId === member.user_id ? member.display_name : 'Friend');

  return (
    <Screen>
      <Pressable style={styles.compose} onPress={() => setShowCreate(true)} testID="create-thread-btn">
        <UserAvatar name={member?.display_name ?? 'You'} size={36} imageUri={member?.avatar_url} />
        <Text style={styles.composeText}>New conversation…</Text>
        <View style={styles.composePlus}>
          <Text style={styles.composePlusText}>+</Text>
        </View>
      </Pressable>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const last = lastMessages[item.id];
          const sender = last ? nameForUser(last.sender_id) : nameForUser(item.created_by);
          return (
            <View style={styles.threadRow}>
              <View style={styles.threadCardMain}>
                <Pressable
                  style={styles.threadOpen}
                  onPress={() => router.push(`/thread/${item.id}`)}
                  testID={`thread-${item.id}`}
                >
                  {members.length > 1 ? (
                    <AvatarStack
                      people={members.map((m) => ({
                        name: m.display_name,
                        imageUri: m.avatar_url,
                      }))}
                      size={48}
                    />
                  ) : (
                    <UserAvatar name={item.name} size={52} />
                  )}
                  <View style={styles.threadText}>
                    <View style={styles.threadTop}>
                      <Text style={styles.threadName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {last ? (
                        <Text style={styles.threadTime}>{formatRelativeTime(last.created_at)}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.preview} numberOfLines={1}>
                      {last ? `${sender}: ${last.body}` : 'No messages yet'}
                    </Text>
                  </View>
                </Pressable>
                {item.poll_id ? (
                  <View style={styles.pollLinkRow}>
                    <PollThreadLink
                      variant="inline"
                      title={pollTitles[item.poll_id] ?? 'Open poll'}
                      onPress={() => router.push(`/plan?pollId=${item.poll_id}`)}
                      testID={`thread-poll-link-${item.id}`}
                    />
                  </View>
                ) : null}
              </View>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDeleteThread(item.id)}
                testID={`delete-thread-${item.id}`}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>No chats yet. Start a conversation with the group.</Text>
        }
      />

      <KeyboardSheet
        visible={showCreate}
        onRequestClose={() => setShowCreate(false)}
        testID="new-thread-sheet"
      >
        <Text style={sharedStyles.modalTitle}>New thread</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Thread name"
          placeholderTextColor={theme.colors.textMuted}
          value={newName}
          onChangeText={setNewName}
          testID="new-thread-name"
        />
        <Pressable style={sharedStyles.primaryBtn} onPress={handleCreateThread}>
          <Text style={sharedStyles.primaryBtnText}>Create</Text>
        </Pressable>
        <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </KeyboardSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  compose: {
    ...feedColumn,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...sharedStyles.card,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    gap: theme.spacing.md,
  },
  composeText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  composePlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composePlusText: {
    color: theme.colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
  list: {
    ...feedColumn,
    paddingBottom: theme.spacing.xxl,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  threadCardMain: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  threadOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pollLinkRow: {
    paddingLeft: 64,
  },
  threadText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  threadName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  threadTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  preview: { color: theme.colors.textSecondary, fontSize: 14 },
  deleteBtn: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
