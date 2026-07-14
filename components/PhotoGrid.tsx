import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { Photo } from '@/lib/database.types';

interface PhotoGridProps {
  photos: Photo[];
  topPhotoIds?: Set<string>;
  onPhotoPress?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  getImageUrl: (photo: Photo, thumb?: boolean) => string;
}

export function PhotoGrid({
  photos,
  topPhotoIds,
  onPhotoPress,
  onDeletePhoto,
  getImageUrl,
}: PhotoGridProps) {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      testID="photo-grid"
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <Pressable
            style={styles.imageWrap}
            onPress={() => onPhotoPress?.(item)}
            testID={`photo-${item.id}`}
          >
            <Image
              source={{ uri: getImageUrl(item, true) }}
              style={styles.image}
              resizeMode="cover"
            />
            {topPhotoIds?.has(item.id) && (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>★</Text>
              </View>
            )}
          </Pressable>
          {onDeletePhoto && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDeletePhoto(item)}
              hitSlop={8}
              testID={`delete-photo-${item.id}`}
            >
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
    position: 'relative',
  },
  imageWrap: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.borderLight,
  },
  topBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: theme.colors.danger,
    borderRadius: 11,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: -1,
  },
});
