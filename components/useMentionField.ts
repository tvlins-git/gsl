import { useCallback, useMemo, useState } from 'react';
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import {
  applyFeedMention,
  getActiveFeedMention,
  listFeedMentionSuggestions,
  type FeedMentionMember,
} from '@/lib/feed-posts';

export function useMentionField(members: FeedMentionMember[], initialBody = '') {
  const [body, setBodyState] = useState(initialBody);
  const [cursor, setCursor] = useState(initialBody.length);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();

  const mentionCursor = cursor === 0 && body.length > 0 ? body.length : cursor;
  const activeMention = useMemo(
    () => getActiveFeedMention(body, mentionCursor),
    [body, mentionCursor]
  );
  const suggestions = useMemo(
    () => (activeMention ? listFeedMentionSuggestions(activeMention.query, members) : []),
    [activeMention, members]
  );

  const onSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setCursor(event.nativeEvent.selection.end);
    setSelection(undefined);
  };

  const onChangeText = (next: string) => {
    setBodyState(next);
    setSelection(undefined);
  };

  const setBody = useCallback((next: string) => {
    setBodyState(next);
    setCursor(next.length);
    setSelection(undefined);
  }, []);

  const insertMention = (insert: string) => {
    if (!activeMention) return;
    const next = applyFeedMention(body, activeMention, insert);
    setBodyState(next.body);
    setCursor(next.cursor);
    setSelection({ start: next.cursor, end: next.cursor });
  };

  return {
    body,
    setBody,
    suggestions,
    insertMention,
    inputProps: {
      value: body,
      onChangeText,
      onSelectionChange,
      selection,
    },
  };
}
