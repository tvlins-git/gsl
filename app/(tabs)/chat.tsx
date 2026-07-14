import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import type { Thread } from '@/lib/database.types';
import { formatMessageTime } from '@/lib/messages';
import { isLocalMode, localStore } from '@/lib/local-store';
import { deleteThread } from '@/lib/thread-list';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

export default function ChatScreen() {
  const { member } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, { body: string; created_at: string }>>({});

  const loadThreads = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const data = isLocalMode()
      ? await localStore.getThreads(member.group_id)
      : (await supabase.from('threads').select('*').eq('group_id', member.group_id).order('created_at', { ascending: false })).data ?? [];
    setThreads(data);

    const msgs: Record<string, { body: string; created_at: string }> = {};
    for (const t of data) {
      const threadMsgs = isLocalMode()
        ? await localStore.getMessages(t.id)
        : (await supabase.from('messages').select('body, created_at').eq('thread_id', t.id).order('created_at', { ascending: false }).limit(1)).data ?? [];
      const m = isLocalMode() ? threadMsgs[threadMsgs.length - 1] : threadMsgs[0];
      if (m) msgs[t.id] = { body: m.body, created_at: m.created_at };
    }
    setLastMessages(msgs);
    setLoading(false);
  }, [member]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

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

  if (loading) {
    return <Screen loading />;
  }

  return (
    <Screen>
      <Pressable style={[styles.createBtn, sharedStyles.primaryBtn]} onPress={() => setShowCreate(true)} testID="create-thread-btn">
        <Text style={sharedStyles.primaryBtnText}>+ New thread</Text>
      </Pressable>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.threadCard, sharedStyles.card]}>
            <Pressable
              style={styles.threadCardMain}
              onPress={() => router.push(`/thread/${item.id}`)}
              testID={`thread-${item.id}`}
            >
              <Text style={styles.threadName}>{item.name}</Text>
              {lastMessages[item.id] && (
                <Text style={styles.preview} numberOfLines={1}>
                  {lastMessages[item.id].body} · {formatMessageTime(lastMessages[item.id].created_at)}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDeleteThread(item.id)}
              testID={`delete-thread-${item.id}`}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={sharedStyles.empty}>No threads yet. Start a conversation!</Text>
        }
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={sharedStyles.modalOverlay}>
          <View style={sharedStyles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={sharedStyles.modalTitle}>New thread</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Thread name"
              placeholderTextColor={theme.colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <Pressable style={sharedStyles.primaryBtn} onPress={handleCreateThread}>
              <Text style={sharedStyles.primaryBtnText}>Create</Text>
            </Pressable>
            <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  threadCardMain: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  deleteBtn: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  threadName: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  preview: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 14 },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
