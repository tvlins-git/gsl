/**
 * How far a docked keyboard covers the bottom of the window.
 * Floating keyboards do not sit on the bottom edge, so they do not need a lift.
 * Android pans or resizes the window itself; callers should ignore this on those platforms.
 */
export function keyboardBottomInset(
  frame: { height: number; screenY: number },
  windowHeight: number,
): number {
  const { height, screenY } = frame;
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) return 0;
  if (!Number.isFinite(screenY)) {
    return Number.isFinite(height) && height > 0 ? height : 0;
  }

  const overlap = windowHeight - screenY;
  if (!Number.isFinite(overlap) || overlap <= 0) return 0;

  // A floating keyboard ends above the bottom of the window.
  if (Number.isFinite(height) && height > 0 && screenY + height < windowHeight - 1) {
    return 0;
  }

  return overlap;
}
