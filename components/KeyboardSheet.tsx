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
import { sharedStyles } from '@/constants/theme';

type KeyboardSheetProps = {
  visible: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
  testID?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  scrollEnabled?: boolean;
  nestedScrollEnabled?: boolean;
  canCancelContentTouches?: boolean;
};

/**
 * Bottom sheet that stays above the iOS keyboard.
 * `paddingBottom` lifts the sheet; `maxHeight` keeps tall forms inside the
 * space that remains so their fields can scroll into view.
 */
export function KeyboardSheet({
  visible,
  onRequestClose,
  children,
  testID,
  sheetStyle,
  contentContainerStyle,
  scrollEnabled = true,
  nestedScrollEnabled,
  canCancelContentTouches,
}: KeyboardSheetProps) {
  const keyboardInset = useKeyboardInset();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.max(160, windowHeight - keyboardInset - insets.top - 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View
        style={[sharedStyles.modalOverlay, { paddingBottom: keyboardInset }]}
        testID={testID ? `${testID}-overlay` : 'keyboard-sheet-overlay'}
      >
        <ScrollView
          testID={testID}
          style={[sharedStyles.modalSheet, styles.sheet, { maxHeight }, sheetStyle]}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled={nestedScrollEnabled}
          canCancelContentTouches={canCancelContentTouches}
          bounces={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flexGrow: 0,
    width: '100%',
  },
});
