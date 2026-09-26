import { useContext, type ReactNode } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
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
};

/** Space left for the sheet above the keyboard and status bar. */
export function sheetMaxHeight(windowHeight: number, keyboardInset: number, topInset: number) {
  return Math.max(160, windowHeight - keyboardInset - topInset - 12);
}

/**
 * Bottom sheet that stays above the iOS keyboard.
 * `paddingBottom` lifts the sheet; `maxHeight` keeps tall forms inside the
 * space that remains so their fields can scroll into view.
 * Optional `footer` stays pinned under the scroll body.
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
}: KeyboardSheetProps) {
  const keyboardInset = useKeyboardInset();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = sheetMaxHeight(windowHeight, keyboardInset, insets.top);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View
        style={[sharedStyles.modalOverlay, { paddingBottom: keyboardInset }]}
        testID={testID ? `${testID}-overlay` : 'keyboard-sheet-overlay'}
      >
        <View
          style={[sharedStyles.modalSheet, styles.sheet, { maxHeight }, sheetStyle]}
          testID={testID ? `${testID}-frame` : 'keyboard-sheet-frame'}
        >
          <ScrollView
            testID={testID}
            style={styles.scroll}
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
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flexGrow: 0,
    flexShrink: 1,
    width: '100%',
    // Padding lives on scroll content / footer so the sticky footer can sit flush.
    padding: 0,
    gap: 0,
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
