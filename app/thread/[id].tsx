import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageBubble } from '@/components/MessageBubble';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import type { Message, Member } from '@/lib/database.types';
import { sortMessagesChronologically } from '@/lib/messages';
import { isLocalMode, localStore } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));

  const loadMessages = useCallback(async () => {
    if (!id || !member) return;
    const m = await getGroupMembers(member.group_id);
    const msgs = isLocalMode()
      ? await localStore.getMessages(id)
      : (await supabase.from('messages').select('*').eq('thread_id', id)).data ?? [];
    setMessages(sortMessagesChronologically(msgs));
    setMembers(m);
    setLoading(false);
  }, [id, member]);

  useEffect(() => {
    loadMessages();

    if (isLocalMode()) return;

    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => sortMessagesChronologically([...prev, payload.new as Message]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMessages]);

  const sendMessage = async () => {
    if (!member || !id || !body.trim()) return;
    const text = body.trim();
    setBody('');

    if (isLocalMode()) {
      const msg = await localStore.addMessage(id, member.user_id, text);
      setMessages((prev) => sortMessagesChronologically([...prev, msg]));
      return;
    }

    await supabase.from('messages').insert({
      thread_id: id,
      sender_id: member.user_id,
      body: text,
    });

    await supabase.functions.invoke('send-push', {
      body: {
        type: 'chat',
        group_id: member.group_id,
        exclude_user_ids: [member.user_id],
        title: 'GSL',
        body: `${member.display_name}: ${text}`,
        data: { threadId: id },
      },
    }).catch(() => undefined);
  };

  if (loading) {
    return <Screen loading />;
  }

  return (
    <KeyboardAvoidingView
      style={sharedStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <MessageBubble
            body={item.body}
            senderName={memberMap[item.sender_id] ?? 'Unknown'}
            createdAt={item.created_at}
            isOwn={item.sender_id === member?.user_id}
          />
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={theme.colors.textMuted}
          value={body}
          onChangeText={setBody}
          testID="message-input"
        />
        <Pressable style={styles.sendBtn} onPress={sendMessage} testID="send-message">
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: theme.spacing.md },
  inputRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
