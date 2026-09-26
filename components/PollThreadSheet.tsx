import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardSheet } from '@/components/KeyboardSheet';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { useMentionField } from '@/components/useMentionField';
import { sharedStyles, theme } from '@/constants/theme';
import type { FeedMentionMember } from '@/lib/feed-posts';
import { defaultPollThreadMessage } from '@/lib/poll-thread';

export interface PollThreadDraft {
  message: string;
  pushUnanswered: boolean;
}

interface PollThreadSheetProps {
  visible: boolean;
  pollTitle: string;
  members: FeedMentionMember[];
  unansweredNames: string[];
  statusLine: string;
  existingThread: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (draft: PollThreadDraft) => void;
}

export function PollThreadSheet({
  visible,
  pollTitle,
  members,
  unansweredNames,
  statusLine,
  existingThread,
  submitting,
  onClose,
  onSubmit,
}: PollThreadSheetProps) {
  const mention = useMentionField(members);
  const [pushUnanswered, setPushUnanswered] = useState(true);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      mention.setBody(defaultPollThreadMessage(pollTitle, unansweredNames));
      setPushUnanswered(unansweredNames.length > 0);
    }
    wasVisible.current = visible;
  }, [visible, pollTitle, unansweredNames, mention.setBody]);

  const canPush = unansweredNames.length > 0;
  const willPush = canPush && pushUnanswered;
  const submitLabel = existingThread
    ? willPush
      ? 'Send & push'
      : 'Send to thread'
    : willPush
      ? 'Start thread & push'
      : 'Start thread';

  return (
    <KeyboardSheet visible={visible} onRequestClose={onClose} testID="poll-thread-sheet">
      <View style={styles.handle} />
      <Text style={sharedStyles.modalTitle}>
        {existingThread ? 'Message the thread' : 'Message the group'}
      </Text>
      <Text style={styles.hint}>
        Includes everyone. The thread links back to this poll and shows up in Chat.
      </Text>
      <Text style={styles.hint}>Use @everyone or @name to notify.</Text>
      <Text style={styles.status}>{statusLine}</Text>
      <TextInput
        style={[sharedStyles.input, styles.message]}
        placeholder="Use @everyone or @name to notify"
        placeholderTextColor={theme.colors.textMuted}
        {...mention.inputProps}
        multiline
        testID="poll-thread-message"
      />
      <MentionSuggestions
        suggestions={mention.suggestions}
        onSelect={mention.insertMention}
        testIDPrefix="poll"
      />
      {canPush ? (
        <Pressable
          style={styles.checkRow}
          onPress={() => setPushUnanswered((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: pushUnanswered }}
          testID="poll-thread-push-unanswered"
        >
          <View style={[styles.box, pushUnanswered && styles.boxOn]}>
            {pushUnanswered ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <View style={styles.checkText}>
            <Text style={styles.checkTitle}>{"Push people who haven't answered"}</Text>
            <Text style={styles.checkMeta}>{unansweredNames.join(', ')}</Text>
          </View>
        </Pressable>
      ) : null}
      <Pressable
        style={[sharedStyles.primaryBtn, (!mention.body.trim() || submitting) && styles.disabled]}
        onPress={() => onSubmit({ message: mention.body.trim(), pushUnanswered: willPush })}
        disabled={!mention.body.trim() || submitting}
        testID="poll-thread-submit"
      >
        {submitting ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Text style={sharedStyles.primaryBtnText}>{submitLabel}</Text>
        )}
      </Pressable>
      <Pressable onPress={onClose} style={styles.cancelBtn} testID="poll-thread-cancel">
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </KeyboardSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  status: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tick: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  checkText: { flex: 1, gap: 2 },
  checkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  checkMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  disabled: { opacity: 0.45 },
  cancelBtn: { paddingVertical: theme.spacing.sm },
  cancel: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 15 },
});
