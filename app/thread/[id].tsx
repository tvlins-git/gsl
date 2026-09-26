import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { MessageBubble } from '@/components/MessageBubble';
import { PollThreadLink } from '@/components/PollThreadLink';
import { useMentionField } from '@/components/useMentionField';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupMembers } from '@/lib/auth';
import type { Message, Member } from '@/lib/database.types';
import {
  createOptimisticMessage,
  mergeMessages,
  sortMessagesChronologically,
} from '@/lib/messages';
import { getPollLinkTarget } from '@/lib/poll-thread';
import { getThread } from '@/lib/thread-list';
import { buildChatPushPayload, listThreadMessages, sendThreadMessage } from '@/lib/thread-messages';
import { isLocalMode } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const mention = useMentionField(members);
  const [loading, setLoading] = useState(true);
  const [pollLink, setPollLink] = useState<{ id: string; title: string } | null>(null);
  const listRef = useRef<FlatList>(null);

  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));

  const loadMessages = useCallback(async () => {
    if (!id || !member) return;
    try {
      const [m, msgs, thread] = await Promise.all([
        getGroupMembers(member.group_id),
        listThreadMessages(id),
        getThread(id),
      ]);
      setMessages(sortMessagesChronologically(msgs));
      setMembers(m);
      if (thread?.poll_id) {
        const poll = await getPollLinkTarget(thread.poll_id);
        setPollLink(poll ?? { id: thread.poll_id, title: 'Poll' });
      } else {
        setPollLink(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, member]);

  useFocusEffect(
    useCallback(() => {
      if (!member) return;
      void getGroupMembers(member.group_id).then(setMembers);
    }, [member])
  );

  useEffect(() => {
    loadMessages();

    if (isLocalMode()) return;

    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => mergeMessages(prev, [payload.new as Message]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMessages]);

  const sendMessage = async () => {
    if (!member || !id || !mention.body.trim()) return;
    const text = mention.body.trim();
    mention.setBody('');

    const optimistic = createOptimisticMessage(id, member.user_id, text);
    setMessages((prev) => mergeMessages(prev, [optimistic]));

    try {
      const saved = await sendThreadMessage(id, member.user_id, text);
      setMessages((prev) => mergeMessages(prev, [saved]));
    } catch {
      await loadMessages();
      return;
    }

    if (isLocalMode()) return;

    try {
      await supabase.functions.invoke('send-push', {
        body: buildChatPushPayload({
          groupId: member.group_id,
          senderId: member.user_id,
          senderName: member.display_name,
          text,
          threadId: id,
          members,
        }),
      });
    } catch {
      // Push is best-effort; the message is already persisted and shown.
    }
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
      {pollLink ? (
        <PollThreadLink
          title={pollLink.title}
          onPress={() => router.push(`/plan?pollId=${pollLink.id}`)}
        />
      ) : null}
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
      <View style={styles.composer}>
        <MentionSuggestions
          suggestions={mention.suggestions}
          onSelect={mention.insertMention}
          testIDPrefix="message"
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message… use @name to notify"
            placeholderTextColor={theme.colors.textMuted}
            {...mention.inputProps}
            testID="message-input"
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage} testID="send-message">
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: theme.spacing.md },
  composer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    gap: theme.spacing.sm,
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
