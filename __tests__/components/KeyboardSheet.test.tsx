import React from 'react';
import { Dimensions, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { KeyboardSheet, sheetMaxHeight, shouldDismissSheetDrag } from '@/components/KeyboardSheet';

jest.mock('@/components/useKeyboardInset', () => ({
  useKeyboardInset: () => 336,
}));

const SAFE_TOP = 47;

function renderSheet({
  footer,
  onRequestClose,
}: {
  footer?: React.ReactNode;
  onRequestClose?: () => void;
} = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: SAFE_TOP, bottom: 34, left: 0, right: 0 },
        frame: { x: 0, y: 0, width: 390, height: 844 },
      }}
    >
      <KeyboardSheet visible testID="new-thread-sheet" footer={footer} onRequestClose={onRequestClose}>
        <Text>Thread name</Text>
      </KeyboardSheet>
    </SafeAreaProvider>,
  );
}

describe('sheetMaxHeight', () => {
  it('leaves room above the keyboard and status bar on a typical iPhone', () => {
    expect(sheetMaxHeight(844, 0, 47)).toBe(785);
    expect(sheetMaxHeight(844, 336, 47)).toBe(449);
    expect(sheetMaxHeight(200, 100, 47)).toBe(160);
  });
});

describe('shouldDismissSheetDrag', () => {
  it('dismisses after a long downward drag or a fast flick', () => {
    expect(shouldDismissSheetDrag(120, 0)).toBe(true);
    expect(shouldDismissSheetDrag(50, 1.2)).toBe(true);
    expect(shouldDismissSheetDrag(20, 0.2)).toBe(false);
  });
});

describe('KeyboardSheet', () => {
  it('lifts the sheet by the keyboard inset and caps its height above the keyboard', () => {
    renderSheet();

    expect(screen.getByText('Thread name')).toBeTruthy();

    const overlay = screen.getByTestId('new-thread-sheet-overlay');
    const overlayStyle = Array.isArray(overlay.props.style)
      ? Object.assign({}, ...overlay.props.style.filter(Boolean))
      : overlay.props.style;
    expect(overlayStyle.paddingBottom).toBe(336);

    const frame = screen.getByTestId('new-thread-sheet-frame');
    const frameStyle = Array.isArray(frame.props.style)
      ? Object.assign({}, ...frame.props.style.filter(Boolean))
      : frame.props.style;
    const windowHeight = Dimensions.get('window').height;
    expect(frameStyle.maxHeight).toBe(sheetMaxHeight(windowHeight, 336, SAFE_TOP));

    const sheet = screen.getByTestId('new-thread-sheet');
    expect(sheet.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('pins an optional footer outside the scroll body', () => {
    renderSheet({ footer: <Text>Create poll</Text> });
    expect(screen.getByTestId('new-thread-sheet-footer')).toBeTruthy();
    expect(screen.getByText('Create poll')).toBeTruthy();
  });

  it('keeps a sticky Close control and dismisses from the header or backdrop', () => {
    const onRequestClose = jest.fn();
    renderSheet({ onRequestClose });

    expect(screen.getByTestId('new-thread-sheet-header')).toBeTruthy();
    fireEvent.press(screen.getByTestId('new-thread-sheet-close'));
    expect(onRequestClose).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('new-thread-sheet-backdrop'));
    expect(onRequestClose).toHaveBeenCalledTimes(2);
  });

  it('bounds the scroll body so tall content cannot push chrome off-screen', () => {
    renderSheet({ footer: <Text>Create poll</Text>, onRequestClose: () => {} });
    const sheet = screen.getByTestId('new-thread-sheet');
    const sheetStyle = Array.isArray(sheet.props.style)
      ? Object.assign({}, ...sheet.props.style.filter(Boolean))
      : sheet.props.style;
    const windowHeight = Dimensions.get('window').height;
    const maxHeight = sheetMaxHeight(windowHeight, 336, SAFE_TOP);
    expect(sheetStyle.maxHeight).toBeLessThanOrEqual(maxHeight);
    expect(sheetStyle.maxHeight).toBeLessThan(maxHeight);
  });
});
