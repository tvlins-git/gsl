/** Fallback while the real image size is unknown — 4:3, never a square crop. */
export const FEED_PHOTO_FALLBACK_ASPECT = 4 / 3;

/** Cap very tall photos; they still letterbox via `contain`, never stretch. */
export const FEED_PHOTO_MAX_HEIGHT = 480;

export function feedPhotoAspect(naturalWidth: number, naturalHeight: number): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return FEED_PHOTO_FALLBACK_ASPECT;
  return naturalWidth / naturalHeight;
}

/**
 * Box height for a full-width photo: width × natural aspect, capped for
 * portrait images. Pair with `resizeMode="contain"` so a cap letterboxes
 * instead of stretching or hard-cropping.
 */
/** RN iOS/Android uses `source`; RN-web ImageLoader passes the browser event as `nativeEvent`. */
export function readLoadedImageSize(nativeEvent: unknown): { width: number; height: number } | null {
  if (!nativeEvent || typeof nativeEvent !== 'object') return null;
  const event = nativeEvent as {
    source?: { width?: number; height?: number };
    target?: { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
    nativeEvent?: unknown;
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  const nested =
    event.nativeEvent && typeof event.nativeEvent === 'object'
      ? (event.nativeEvent as typeof event)
      : null;
  const candidates = [event.source, event.target, nested?.source, nested?.target, event, nested];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const width = Number(
      'width' in candidate && candidate.width
        ? candidate.width
        : 'naturalWidth' in candidate
          ? candidate.naturalWidth
          : 0
    );
    const height = Number(
      'height' in candidate && candidate.height
        ? candidate.height
        : 'naturalHeight' in candidate
          ? candidate.naturalHeight
          : 0
    );
    if (width > 0 && height > 0) return { width, height };
  }
  return null;
}

export function feedPhotoDisplayHeight(
  boxWidth: number,
  aspect: number,
  maxHeight = FEED_PHOTO_MAX_HEIGHT
): number {
  const safeAspect = aspect > 0 ? aspect : FEED_PHOTO_FALLBACK_ASPECT;
  if (boxWidth <= 0) return 0;
  return Math.min(boxWidth / safeAspect, maxHeight);
}
