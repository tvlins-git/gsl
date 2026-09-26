import { router, useFocusEffect, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { useKeyboardInset } from '@/components/useKeyboardInset';
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
import { shouldRefreshThreadOnNotification } from '@/lib/notification-refresh';
import { subscribeToThreadInserts } from '@/lib/thread-realtime';
import { useNotificationRefresh } from '@/lib/use-notification-refresh';
import {
  buildChatPushPayload,
  listThreadMessages,
  sendThreadMessage,
  shouldSendChatPush,
} from '@/lib/thread-messages';
import { isLocalMode } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import { sharedStyles, theme } from '@/constants/theme';

/**
 * Live updates sit under their own boundary. A refused realtime subscribe used
 * to throw out of this screen and the root layout replaced the whole app.
 */
class ThreadSubscriptionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function ThreadLiveUpdates({
  threadId,
  onInsert,
}: {
  threadId: string;
  onInsert: (message: Message) => void;
}) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (isLocalMode()) return;
    try {
      return subscribeToThreadInserts(threadId, (message) => {
        onInsertRef.current(message);
      });
    } catch {
      return undefined;
    }
  }, [threadId]);

  return null;
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={[sharedStyles.screen, styles.errorFallback]}>
      <Text style={styles.errorTitle}>This chat hit a connection error.</Text>
      <Text style={styles.errorBody}>The rest of GSL is still open. You can try the thread again.</Text>
      <Pressable style={sharedStyles.primaryBtn} onPress={() => void retry()} testID="thread-error-retry">
        <Text style={sharedStyles.primaryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuth();
  const keyboardInset = useKeyboardInset();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const mention = useMentionField(members);
  const [loading, setLoading] = useState(true);
  const [pollLink, setPollLink] = useState<{ id: string; title: string } | null>(null);
  const listRef = useRef<FlatList>(null);

  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));
  const avatarMap = Object.fromEntries(members.map((m) => [m.user_id, m.avatar_url]));

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

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages])
  );

  useNotificationRefresh(
    useCallback(
      (link) => typeof id === 'string' && shouldRefreshThreadOnNotification(link, id),
      [id]
    ),
    loadMessages
  );

  useFocusEffect(
    useCallback(() => {
      if (!id || isLocalMode()) return undefined;
      const interval = setInterval(() => {
        void listThreadMessages(id).then((msgs) => {
          setMessages((prev) => mergeMessages(prev, msgs));
        });
      }, 8000);
      return () => clearInterval(interval);
    }, [id])
  );

  const handleInsert = useCallback((message: Message) => {
    setMessages((prev) => mergeMessages(prev, [message]));
  }, []);

  const sendMessage = async () => {
    if (!member || !id || !mention.body.trim()) return;
    const text = mention.body.trim();
    mention.setBody('');
    Keyboard.dismiss();

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
      const pushBody = buildChatPushPayload({
        groupId: member.group_id,
        senderId: member.user_id,
        senderName: member.display_name,
        text,
        threadId: id,
        members,
      });
      const audience = {
        userIds: pushBody.user_ids ?? null,
        tagNotification: pushBody.tag_notification,
      };
      if (!shouldSendChatPush(audience)) return;

      await supabase.functions.invoke('send-push', {
        body: pushBody,
      });
    } catch {
      // Push is best-effort; the message is already persisted and shown.
    }
  };

  const liveUpdates =
    typeof id === 'string' && id.length > 0 ? (
      <ThreadSubscriptionBoundary>
        <ThreadLiveUpdates threadId={id} onInsert={handleInsert} />
      </ThreadSubscriptionBoundary>
    ) : null;

  return (
    <>
      {liveUpdates}
      {loading ? (
        <Screen loading />
      ) : (
        <View style={[sharedStyles.screen, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
          {pollLink ? (
            <PollThreadLink
              title={pollLink.title}
              onPress={() => router.navigate(`/plan?pollId=${pollLink.id}`)}
            />
          ) : null}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <MessageBubble
                body={item.body}
                senderName={memberMap[item.sender_id] ?? 'Unknown'}
                senderAvatarUrl={avatarMap[item.sender_id]}
                createdAt={item.created_at}
                isOwn={item.sender_id === member?.user_id}
              />
            )}
          />
          <View style={[styles.composer, keyboardInset > 0 && styles.composerAboveKeyboard]}>
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
        </View>
      )}
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
  list: { paddingVertical: theme.spacing.md },
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
