import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useKeyboardInset } from '@/components/useKeyboardInset';
import { sharedStyles, theme } from '@/constants/theme';

type KeyboardSheetProps = {
  visible: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
  /** Pinned below the scroll area so primary actions stay reachable on short phones. */
  footer?: ReactNode;
  testID?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  footerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  nestedScrollEnabled?: boolean;
  canCancelContentTouches?: boolean;
  /** Show sticky Close in the header. Defaults to true when `onRequestClose` is set. */
  showCloseButton?: boolean;
};

const HEADER_HEIGHT = 52;
const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.9;

/** Space left for the sheet above the keyboard and status bar. */
export function sheetMaxHeight(windowHeight: number, keyboardInset: number, topInset: number) {
  return Math.max(160, windowHeight - keyboardInset - topInset - 12);
}

/** Whether a downward header drag should dismiss the sheet. */
export function shouldDismissSheetDrag(dy: number, vy: number) {
  return dy > DISMISS_DISTANCE || (dy > 40 && vy > DISMISS_VELOCITY);
}

/**
 * Bottom sheet that stays above the iOS keyboard.
 * Sticky header (handle + Close) and optional footer stay outside the scroll
 * body so dismiss / submit stay reachable. Backdrop tap and header drag also
 * dismiss when `onRequestClose` is provided — drag is header-only so it does
 * not fight nested calendar / time-wheel gestures.
 */
export function KeyboardSheet({
  visible,
  onRequestClose,
  children,
  footer,
  testID,
  sheetStyle,
  contentContainerStyle,
  footerStyle,
  scrollEnabled = true,
  nestedScrollEnabled,
  canCancelContentTouches,
  showCloseButton,
}: KeyboardSheetProps) {
  const keyboardInset = useKeyboardInset();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = sheetMaxHeight(windowHeight, keyboardInset, insets.top);
  const [footerHeight, setFooterHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const closeVisible = showCloseButton ?? Boolean(onRequestClose);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only the header claims vertical pans — scroll / wheels keep their own gestures.
        onMoveShouldSetPanResponder: (_event: GestureResponderEvent, gesture: PanResponderGestureState) =>
          Boolean(onRequestCloseRef.current) &&
          gesture.dy > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (onRequestCloseRef.current && shouldDismissSheetDrag(gesture.dy, gesture.vy)) {
            onRequestCloseRef.current();
            translateY.setValue(0);
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [translateY],
  );

  const scrollMaxHeight = Math.max(80, maxHeight - HEADER_HEIGHT - (footer ? footerHeight : 0));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View
        style={[sharedStyles.modalOverlay, { paddingBottom: keyboardInset }]}
        testID={testID ? `${testID}-overlay` : 'keyboard-sheet-overlay'}
      >
        {onRequestClose ? (
          <Pressable
            style={styles.backdrop}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            testID={testID ? `${testID}-backdrop` : 'keyboard-sheet-backdrop'}
          />
        ) : null}
        <Animated.View
          style={[
            sharedStyles.modalSheet,
            styles.sheet,
            { maxHeight, transform: [{ translateY }] },
            sheetStyle,
          ]}
          testID={testID ? `${testID}-frame` : 'keyboard-sheet-frame'}
        >
          <View
            style={styles.header}
            testID={testID ? `${testID}-header` : 'keyboard-sheet-header'}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} accessibilityLabel="Drag down to dismiss" />
            {closeVisible && onRequestClose ? (
              <Pressable
                onPress={onRequestClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                testID={testID ? `${testID}-close` : 'keyboard-sheet-close'}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            ) : (
              <View style={styles.closeSpacer} />
            )}
          </View>
          <ScrollView
            testID={testID}
            style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={[styles.defaultContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEnabled={scrollEnabled}
            nestedScrollEnabled={nestedScrollEnabled}
            canCancelContentTouches={canCancelContentTouches}
            bounces={false}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={[styles.footer, styles.defaultFooter, footerStyle]}
              testID={testID ? `${testID}-footer` : 'keyboard-sheet-footer'}
              onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    flexGrow: 0,
    flexShrink: 1,
    width: '100%',
    // Padding lives on scroll content / footer so the sticky chrome can sit flush.
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  header: {
    height: HEADER_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  closeSpacer: {
    height: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    width: '100%',
  },
  defaultContent: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderLight,
  },
  defaultFooter: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});
