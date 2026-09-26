import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { keyboardBottomInset } from '@/lib/keyboard-inset';

/**
 * Bottom overlap of the iOS keyboard, in points.
 * Android uses window pan/resize (`softwareKeyboardLayoutMode`), so this stays 0 there
 * and avoids lifting a view the system already moved.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    const apply = (event: KeyboardEvent) => {
      setInset(
        keyboardBottomInset(
          {
            height: event.endCoordinates.height,
            screenY: event.endCoordinates.screenY,
          },
          Dimensions.get('window').height,
        ),
      );
    };

    const hide = () => setInset(0);
    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', apply),
      Keyboard.addListener('keyboardWillChangeFrame', apply),
      Keyboard.addListener('keyboardWillHide', hide),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return inset;
}
