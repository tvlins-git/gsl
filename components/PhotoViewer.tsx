import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import type { Photo } from '@/lib/database.types';

export function albumViewerIndexAfterSwipe(
  current: number,
  total: number,
  dx: number,
  vx: number,
  threshold: number
) {
  if (total <= 0) return 0;
  const goNext = dx < -threshold || vx < -0.4;
  const goPrev = dx > threshold || vx > 0.4;
  if (goNext) return Math.min(current + 1, total - 1);
  if (goPrev) return Math.max(current - 1, 0);
  return current;
}

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
  const [index, setIndex] = useState(Math.max(0, initialIndex));
  const indexRef = useRef(index);
  indexRef.current = index;
  const translateX = useRef(new Animated.Value(0)).current;

  const pageWidth = Math.max(width, 1);
  const safeIndex = photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const current = photos[safeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (photos.length === 0) return;
      const clamped = Math.max(0, Math.min(next, photos.length - 1));
      setIndex(clamped);
      translateX.setValue(0);
    },
    [photos.length, translateX]
  );

  useEffect(() => {
    if (!visible) return;
    goTo(initialIndex);
  }, [visible, initialIndex, goTo]);

  useEffect(() => {
    if (visible && photos.length === 0) onClose();
  }, [visible, photos.length, onClose]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(indexRef.current + 1);
      if (event.key === 'ArrowLeft') goTo(indexRef.current - 1);
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, goTo, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_event, gesture) => {
          const currentIndex = indexRef.current;
          const threshold = Math.max(48, pageWidth * 0.18);
          const next = albumViewerIndexAfterSwipe(
            currentIndex,
            photos.length,
            gesture.dx,
            gesture.vx,
            threshold
          );
          if (next !== currentIndex) {
            goTo(next);
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        },
      }),
    [goTo, pageWidth, photos.length, translateX]
  );

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

        <Animated.View
          style={[styles.stage, { height: height - 88, transform: [{ translateX }] }]}
          testID="photo-viewer-stage"
          {...panResponder.panHandlers}
        >
          {current ? (
            <Image
              source={{ uri: getImageUrl(current, false) }}
              style={styles.image}
              resizeMode="contain"
              testID={`photo-viewer-image-${current.id}`}
              accessibilityRole="image"
            />
          ) : null}
        </Animated.View>
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
  stage: {
    flex: 1,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});
