import React from 'react';
import { Dimensions, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { KeyboardSheet } from '@/components/KeyboardSheet';

jest.mock('@/components/useKeyboardInset', () => ({
  useKeyboardInset: () => 336,
}));

const SAFE_TOP = 47;

function renderSheet() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: SAFE_TOP, bottom: 34, left: 0, right: 0 },
        frame: { x: 0, y: 0, width: 390, height: 844 },
      }}
    >
      <KeyboardSheet visible testID="new-thread-sheet">
        <Text>Thread name</Text>
      </KeyboardSheet>
    </SafeAreaProvider>,
  );
}

describe('KeyboardSheet', () => {
  it('lifts the sheet by the keyboard inset and caps its height above the keyboard', () => {
    renderSheet();

    expect(screen.getByText('Thread name')).toBeTruthy();

    const overlay = screen.getByTestId('new-thread-sheet-overlay');
    const overlayStyle = Array.isArray(overlay.props.style)
      ? Object.assign({}, ...overlay.props.style.filter(Boolean))
      : overlay.props.style;
    expect(overlayStyle.paddingBottom).toBe(336);

    const sheet = screen.getByTestId('new-thread-sheet');
    const sheetStyle = Array.isArray(sheet.props.style)
      ? Object.assign({}, ...sheet.props.style.filter(Boolean))
      : sheet.props.style;
    const windowHeight = Dimensions.get('window').height;
    expect(sheetStyle.maxHeight).toBe(Math.max(160, windowHeight - 336 - SAFE_TOP - 12));
    expect(sheet.props.keyboardShouldPersistTaps).toBe('handled');
  });
});
