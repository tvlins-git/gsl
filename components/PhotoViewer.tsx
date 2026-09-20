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
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function albumViewerShouldDismiss(dx: number, dy: number, vy: number) {
  return dy > 72 && dy >= Math.abs(dx) && (dy > 96 || vy > 0.45);
}

interface PhotoViewerProps {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  getImageUrl: (photo: Photo, thumb?: boolean) => string;
  onClose: () => void;
  onDelete?: (photo: Photo) => void;
}

type PointerLikeEvent = {
  nativeEvent: {
    pageX?: number;
    pageY?: number;
    clientX?: number;
    clientY?: number;
    changedTouches?: { pageX?: number; pageY?: number }[];
  };
};

function pointerPoint(event: PointerLikeEvent) {
  const native = event.nativeEvent;
  const touch = native.changedTouches?.[0];
  return {
    x: native.pageX ?? native.clientX ?? touch?.pageX ?? 0,
    y: native.pageY ?? native.clientY ?? touch?.pageY ?? 0,
  };
}

export function PhotoViewer(props: PhotoViewerProps) {
  const { visible, photos, onClose } = props;
  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
      testID="photo-viewer"
    >
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 12, left: 0, right: 0, bottom: 0 },
        }}
      >
        <PhotoViewerBody {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function PhotoViewerBody({
  photos,
  initialIndex,
  getImageUrl,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(Math.max(0, initialIndex));
  const indexRef = useRef(index);
  indexRef.current = index;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const pageWidth = Math.max(width, 1);
  const safeIndex = photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const current = photos[safeIndex];

  const resetDrag = useCallback(() => {
    translateX.setValue(0);
    translateY.setValue(0);
  }, [translateX, translateY]);

  const goTo = useCallback(
    (next: number) => {
      if (photos.length === 0) return;
      setIndex(Math.max(0, Math.min(next, photos.length - 1)));
      resetDrag();
    },
    [photos.length, resetDrag]
  );

  const finishDrag = useCallback(
    (dx: number, dy: number, vx = 0, vy = 0) => {
      if (albumViewerShouldDismiss(dx, dy, vy)) {
        onClose();
        resetDrag();
        return;
      }
      const threshold = Math.max(48, pageWidth * 0.18);
      const next = albumViewerIndexAfterSwipe(
        indexRef.current,
        photos.length,
        dx,
        vx,
        threshold
      );
      if (next !== indexRef.current && Math.abs(dx) >= Math.abs(dy)) {
        goTo(next);
        return;
      }
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start();
    },
    [goTo, onClose, pageWidth, photos.length, resetDrag, translateX, translateY]
  );

  useEffect(() => {
    goTo(initialIndex);
  }, [initialIndex, goTo]);

  useEffect(() => {
    if (photos.length === 0) onClose();
  }, [photos.length, onClose]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(indexRef.current + 1);
      if (event.key === 'ArrowLeft') goTo(indexRef.current - 1);
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_event, gesture) => {
          if (Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 0) {
            translateY.setValue(gesture.dy);
            translateX.setValue(0);
          } else {
            translateX.setValue(gesture.dx);
            translateY.setValue(0);
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          finishDrag(gesture.dx, gesture.dy, gesture.vx, gesture.vy);
        },
        onPanResponderTerminate: () => finishDrag(0, 0),
      }),
    [finishDrag, translateX, translateY]
  );

  const webDragHandlers =
    Platform.OS === 'web'
      ? {
          onPointerDown: (event: PointerLikeEvent) => {
            dragOrigin.current = pointerPoint(event);
          },
          onPointerMove: (event: PointerLikeEvent) => {
            if (!dragOrigin.current) return;
            const point = pointerPoint(event);
            const dx = point.x - dragOrigin.current.x;
            const dy = point.y - dragOrigin.current.y;
            if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
              translateY.setValue(dy);
              translateX.setValue(0);
            } else {
              translateX.setValue(dx);
              translateY.setValue(0);
            }
          },
          onPointerUp: (event: PointerLikeEvent) => {
            if (!dragOrigin.current) return;
            const point = pointerPoint(event);
            const dx = point.x - dragOrigin.current.x;
            const dy = point.y - dragOrigin.current.y;
            dragOrigin.current = null;
            finishDrag(dx, dy);
          },
          onPointerCancel: () => {
            dragOrigin.current = null;
            finishDrag(0, 0);
          },
        }
      : {};

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: theme.spacing.sm,
          },
        ]}
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          testID="photo-viewer-close"
          accessibilityRole="button"
          accessibilityLabel="Close photo viewer"
          style={styles.chromeBtn}
        >
          <Text style={styles.closeMark}>✕</Text>
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
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        ) : (
          <View style={styles.chromeBtn} />
        )}
      </View>

      <View
        style={[styles.stage, { height: Math.max(height - 88 - insets.top - insets.bottom, 1) }]}
        testID="photo-viewer-stage"
        {...panResponder.panHandlers}
        {...webDragHandlers}
      >
        <Animated.View
          style={[styles.imageShift, { transform: [{ translateX }, { translateY }] }]}
          pointerEvents="none"
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111111',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    zIndex: 2,
  },
  chromeBtn: {
    minWidth: 44,
    paddingVertical: 8,
  },
  closeMark: {
    color: '#d0d0d0',
    fontSize: 20,
    fontWeight: '600',
  },
  deleteText: {
    color: '#9a9a9a',
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
  },
  counter: {
    color: '#9a9a9a',
    fontSize: 14,
    fontWeight: '600',
  },
  stage: {
    flex: 1,
    width: '100%',
  },
  imageShift: {
    flex: 1,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111111',
  },
});
