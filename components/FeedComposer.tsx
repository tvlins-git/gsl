import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import {
  applyFeedMention,
  canSubmitFeedPost,
  createFeedPost,
  getActiveFeedMention,
  listFeedMentionSuggestions,
  parseFeedMentions,
} from '@/lib/feed-posts';
import { isCameraPickerAvailable, pickImageUri, type ImagePickSource } from '@/lib/pick-image';

interface FeedComposerProps {
  members: Member[];
  author: Member;
  onPosted: () => void | Promise<void>;
}

export function FeedComposer({ members, author, onPosted }: FeedComposerProps) {
  const [body, setBody] = useState('');
  const [cursor, setCursor] = useState(0);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canPost = canSubmitFeedPost(body, imageUri) && !posting;
  const mentionCursor = cursor === 0 && body.length > 0 ? body.length : cursor;
  const activeMention = useMemo(
    () => getActiveFeedMention(body, mentionCursor),
    [body, mentionCursor]
  );
  const suggestions = useMemo(
    () => (activeMention ? listFeedMentionSuggestions(activeMention.query, members) : []),
    [activeMention, members]
  );

  const attachImage = async (source: ImagePickSource) => {
    setError('');
    const uri = await pickImageUri(source);
    if (uri) {
      setImageUri(uri);
    }
  };

  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const next = event.nativeEvent.selection;
    setCursor(next.end);
    setSelection(undefined);
  };

  const handleChangeText = (next: string) => {
    setBody(next);
    setSelection(undefined);
    setError('');
  };

  const insertMention = (insert: string) => {
    if (!activeMention) return;
    const next = applyFeedMention(body, activeMention, insert);
    setBody(next.body);
    setCursor(next.cursor);
    setSelection({ start: next.cursor, end: next.cursor });
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError('');
    const tags = parseFeedMentions(body, members);
    try {
      await createFeedPost({
        groupId: author.group_id,
        authorId: author.user_id,
        authorName: author.display_name,
        body,
        imageUri,
        tagAll: tags.tagAll,
        taggedUserIds: tags.tagAll ? [] : tags.userIds,
        groupUserIds: members.map((member) => member.user_id),
      });
      setBody('');
      setCursor(0);
      setImageUri(null);
      await onPosted();
    } catch {
      setError('Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <UserAvatar name={author.display_name} size={36} imageUri={author.avatar_url} />
          <TextInput
            style={styles.input}
            placeholder="Use @everyone or @name to notify"
            placeholderTextColor={theme.colors.textMuted}
            value={body}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            multiline
            testID="feed-composer-input"
          />
        </View>
        {suggestions.length > 0 ? (
          <View style={styles.suggestions} testID="feed-mention-suggestions">
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.id}
                style={styles.suggestion}
                onPress={() => insertMention(suggestion.insert)}
                testID={
                  suggestion.id === 'everyone'
                    ? 'feed-mention-everyone'
                    : `feed-mention-member-${suggestion.id}`
                }
                accessibilityRole="button"
                accessibilityLabel={`Mention ${suggestion.label}`}
              >
                <Text style={styles.suggestionText}>@{suggestion.insert}</Text>
                {suggestion.id !== 'everyone' ? (
                  <Text style={styles.suggestionMeta}>{suggestion.label}</Text>
                ) : (
                  <Text style={styles.suggestionMeta}>Notify the whole group</Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable
              onPress={() => setImageUri(null)}
              style={styles.removePreview}
              testID="feed-composer-remove-photo"
            >
              <Text style={styles.removePreviewText}>Remove photo</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.actions}>
          {isCameraPickerAvailable() ? (
            <Pressable
              style={styles.chip}
              onPress={() => attachImage('camera')}
              testID="feed-composer-camera"
              accessibilityRole="button"
              accessibilityLabel="Take photo with camera"
            >
              <Text style={styles.chipText}>Camera</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.chip}
            onPress={() => attachImage('gallery')}
            testID="feed-composer-gallery"
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery"
          >
            <Text style={styles.chipText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost}
            testID="feed-composer-post"
            accessibilityRole="button"
            accessibilityLabel="Post"
          >
            {posting ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: theme.colors.text,
    paddingTop: 8,
  },
  suggestions: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 2,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  suggestionMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  previewWrap: {
    gap: 6,
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.borderLight,
  },
  removePreview: {
    alignSelf: 'flex-start',
  },
  removePreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postBtn: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 68,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.45,
  },
  postBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
