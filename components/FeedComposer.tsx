import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { sharedStyles, theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';
import {
  canSubmitFeedPost,
  createFeedPost,
  formatTagPickerLabel,
  isValidFeedTagSelection,
  type FeedTagSelection,
} from '@/lib/feed-posts';

interface FeedComposerProps {
  members: Member[];
  author: Member;
  onPosted: () => void | Promise<void>;
}

export function FeedComposer({ members, author, onPosted }: FeedComposerProps) {
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tagAll, setTagAll] = useState(true);
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const selection: FeedTagSelection = tagAll ? { tagAll: true } : { tagAll: false, userIds: taggedUserIds };
  const canPost =
    canSubmitFeedPost(body, imageUri) && isValidFeedTagSelection(selection) && !posting;
  const tagLabel = formatTagPickerLabel(selection, members);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError('');
    }
  };

  const toggleMember = (userId: string) => {
    setTagAll(false);
    setTaggedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const selectEveryone = () => {
    setTagAll(true);
    setTaggedUserIds([]);
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError('');
    try {
      await createFeedPost({
        groupId: author.group_id,
        authorId: author.user_id,
        authorName: author.display_name,
        body,
        imageUri,
        tagAll,
        taggedUserIds,
        groupUserIds: members.map((member) => member.user_id),
      });
      setBody('');
      setImageUri(null);
      setTagAll(true);
      setTaggedUserIds([]);
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
            placeholder="Write an update…"
            placeholderTextColor={theme.colors.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            testID="feed-composer-input"
          />
        </View>
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
          <Pressable
            style={styles.chip}
            onPress={pickImage}
            testID="feed-composer-photo"
            accessibilityRole="button"
            accessibilityLabel="Attach photo"
          >
            <Text style={styles.chipText}>Photo</Text>
          </Pressable>
          <Pressable
            style={styles.chip}
            onPress={() => setTagOpen(true)}
            testID="feed-composer-tags"
            accessibilityRole="button"
            accessibilityLabel={`Tag ${tagLabel}`}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {tagLabel}
            </Text>
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

      <Modal visible={tagOpen} transparent animationType="fade" onRequestClose={() => setTagOpen(false)}>
        <Pressable style={sharedStyles.modalOverlay} onPress={() => setTagOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Tag people</Text>
            <Text style={styles.sheetHint}>Everyone, or pick specific members.</Text>
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[styles.option, tagAll && styles.optionSelected]}
                onPress={selectEveryone}
                testID="feed-tag-all"
              >
                <Text style={[styles.optionText, tagAll && styles.optionTextSelected]}>Everyone</Text>
              </Pressable>
              {members.map((member) => {
                const selected = !tagAll && taggedUserIds.includes(member.user_id);
                return (
                  <Pressable
                    key={member.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => toggleMember(member.user_id)}
                    testID={`feed-tag-member-${member.id}`}
                  >
                    <View style={styles.optionPerson}>
                      <UserAvatar name={member.display_name} size={32} imageUri={member.avatar_url} />
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {member.display_name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.doneBtn} onPress={() => setTagOpen(false)} testID="feed-tag-done">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    maxWidth: 140,
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
  sheet: {
    marginHorizontal: theme.spacing.lg,
    marginTop: 'auto',
    marginBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sheetHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  options: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  optionSelected: {
    backgroundColor: theme.colors.accentSoft,
  },
  optionPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  doneBtn: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
