import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { theme } from '@/constants/theme';
import type { Photo } from '@/lib/database.types';

interface PhotoViewerProps {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  getImageUrl: (photo: Photo, thumb?: boolean) => string;
  onClose: () => void;
  onDelete?: (photo: Photo) => void;
}

export function PhotoViewer({
  visible,
  photos,
  initialIndex,
  getImageUrl,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Photo>>(null);
  const [index, setIndex] = useState(Math.max(0, initialIndex));

  const pageWidth = Math.max(width, 1);
  const safeIndex = photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const current = photos[safeIndex];

  useEffect(() => {
    if (!visible) return;
    const next = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0));
    setIndex(next);
    const frame = requestAnimationFrame(() => {
      if (photos.length === 0) return;
      listRef.current?.scrollToIndex({ index: next, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, initialIndex, photos.length]);

  useEffect(() => {
    if (visible && photos.length === 0) onClose();
  }, [visible, photos.length, onClose]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      if (Number.isFinite(next)) {
        setIndex(Math.max(0, Math.min(next, photos.length - 1)));
      }
    },
    [pageWidth, photos.length]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === 'number') setIndex(next);
  }).current;

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
      testID="photo-viewer"
    >
      <View style={styles.screen}>
        <View style={styles.chrome}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            testID="photo-viewer-close"
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            style={styles.chromeBtn}
          >
            <Text style={styles.chromeText}>Close</Text>
          </Pressable>
          <Text style={styles.counter} testID="photo-viewer-counter">
            {safeIndex + 1} / {photos.length}
          </Text>
          {onDelete && current ? (
            <Pressable
              onPress={() => onDelete(current)}
              hitSlop={12}
              testID="photo-viewer-delete"
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
              style={styles.chromeBtn}
            >
              <Text style={[styles.chromeText, styles.deleteText]}>Delete</Text>
            </Pressable>
          ) : (
            <View style={styles.chromeBtn} />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={photos.length}
          windowSize={Math.max(photos.length, 2)}
          removeClippedSubviews={false}
          initialScrollIndex={Math.min(initialIndex, photos.length - 1)}
          getItemLayout={(_data, itemIndex) => ({
            length: pageWidth,
            offset: pageWidth * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onScrollToIndexFailed={({ index: failedIndex }) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({ index: failedIndex, animated: false });
            });
          }}
          renderItem={({ item }) => (
            <View style={{ width: pageWidth, height: height - 88 }} testID={`photo-viewer-page-${item.id}`}>
              <Image
                source={{ uri: getImageUrl(item, false) }}
                style={styles.image}
                resizeMode="contain"
                testID={`photo-viewer-image-${item.id}`}
                accessibilityRole="image"
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 54 : theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    zIndex: 2,
  },
  chromeBtn: {
    minWidth: 64,
    paddingVertical: 8,
  },
  chromeText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    color: '#f8b4b4',
    textAlign: 'right',
  },
  counter: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});
