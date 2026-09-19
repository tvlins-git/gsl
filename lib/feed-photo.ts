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
export function feedPhotoDisplayHeight(
  boxWidth: number,
  aspect: number,
  maxHeight = FEED_PHOTO_MAX_HEIGHT
): number {
  const safeAspect = aspect > 0 ? aspect : FEED_PHOTO_FALLBACK_ASPECT;
  if (boxWidth <= 0) return 0;
  return Math.min(boxWidth / safeAspect, maxHeight);
}
