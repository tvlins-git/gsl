import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FeedPhoto } from '@/components/FeedPhoto';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { useMentionField } from '@/components/useMentionField';
import { UserAvatar } from '@/components/UserAvatar';
import { theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import { canSubmitFeedPost, createFeedPost, parseFeedMentions } from '@/lib/feed-posts';
import { isCameraPickerAvailable, pickImageUri, type ImagePickSource } from '@/lib/pick-image';
import { formatUserFacingError } from '@/lib/user-error';

interface FeedComposerProps {
  members: Member[];
  author: Member;
  onPosted: () => void | Promise<void>;
}

export function FeedComposer({ members, author, onPosted }: FeedComposerProps) {
  const mention = useMentionField(members);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canPost = canSubmitFeedPost(mention.body, imageUri) && !posting;

  const attachImage = async (source: ImagePickSource) => {
    setError('');
    const uri = await pickImageUri(source);
    if (uri) {
      setImageUri(uri);
    }
  };

  const handleChangeText = (next: string) => {
    mention.inputProps.onChangeText(next);
    setError('');
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError('');
    const tags = parseFeedMentions(mention.body, members);
    try {
      await createFeedPost({
        groupId: author.group_id,
        authorId: author.user_id,
        authorName: author.display_name,
        body: mention.body,
        imageUri,
        tagAll: tags.tagAll,
        taggedUserIds: tags.tagAll ? [] : tags.userIds,
        groupUserIds: members.map((member) => member.user_id),
      });
      mention.setBody('');
      setImageUri(null);
      await onPosted();
    } catch (err) {
      setError(formatUserFacingError(err, 'Could not post. Try again.'));
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
            value={mention.inputProps.value}
            onChangeText={handleChangeText}
            onSelectionChange={mention.inputProps.onSelectionChange}
            selection={mention.inputProps.selection}
            multiline
            testID="feed-composer-input"
          />
        </View>
        <MentionSuggestions
          suggestions={mention.suggestions}
          onSelect={mention.insertMention}
          testIDPrefix="feed"
        />
        {imageUri ? (
          <View style={styles.previewWrap}>
            <FeedPhoto uri={imageUri} style={styles.preview} testID="feed-composer-preview-photo" />
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
  previewWrap: {
    gap: 6,
  },
  preview: {
    borderRadius: theme.radius.md,
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
