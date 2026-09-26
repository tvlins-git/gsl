import { keyboardBottomInset } from '@/lib/keyboard-inset';

const WINDOW = 844;

describe('keyboardBottomInset', () => {
  it('returns the overlap of a docked keyboard', () => {
    expect(keyboardBottomInset({ height: 336, screenY: 508 }, WINDOW)).toBe(336);
  });

  it('returns 0 once the keyboard has moved off the bottom', () => {
    expect(keyboardBottomInset({ height: 336, screenY: WINDOW }, WINDOW)).toBe(0);
    expect(keyboardBottomInset({ height: 0, screenY: WINDOW }, WINDOW)).toBe(0);
  });

  it('ignores a floating keyboard that does not cover the bottom edge', () => {
    expect(keyboardBottomInset({ height: 280, screenY: 200 }, WINDOW)).toBe(0);
  });

  it('falls back to height when the keyboard frame has no screen position', () => {
    expect(keyboardBottomInset({ height: 300, screenY: Number.NaN }, WINDOW)).toBe(300);
    expect(keyboardBottomInset({ height: 0, screenY: Number.NaN }, WINDOW)).toBe(0);
  });

  it('returns 0 for an unusable window height', () => {
    expect(keyboardBottomInset({ height: 336, screenY: 508 }, 0)).toBe(0);
  });
});
