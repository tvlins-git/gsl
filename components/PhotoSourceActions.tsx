import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { sharedStyles, theme } from '@/constants/theme';

interface PhotoSourceActionsProps {
  uploading: boolean;
  cameraAvailable: boolean;
  onGallery: () => void;
  onCamera: () => void;
}

export function PhotoSourceActions({
  uploading,
  cameraAvailable,
  onGallery,
  onCamera,
}: PhotoSourceActionsProps) {
  return (
    <View style={styles.actions}>
      <Pressable
        testID="photo-gallery-btn"
        style={[styles.actionBtn, sharedStyles.primaryBtn, uploading && styles.actionDisabled]}
        onPress={onGallery}
        disabled={uploading}
      >
        <Text style={sharedStyles.primaryBtnText}>Gallery</Text>
      </Pressable>
      {cameraAvailable ? (
        <Pressable
          testID="photo-camera-btn"
          style={[styles.actionBtn, sharedStyles.secondaryBtn, uploading && styles.actionDisabled]}
          onPress={onCamera}
          disabled={uploading}
        >
          <Text style={sharedStyles.secondaryBtnText}>Camera</Text>
        </Pressable>
      ) : null}
      {uploading && <ActivityIndicator color={theme.colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
  },
  actionBtn: { flex: 1 },
  actionDisabled: { opacity: 0.45 },
});
