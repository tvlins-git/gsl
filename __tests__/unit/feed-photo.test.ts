import {
  FEED_PHOTO_FALLBACK_ASPECT,
  FEED_PHOTO_MAX_HEIGHT,
  feedPhotoAspect,
  feedPhotoDisplayHeight,
  readLoadedImageSize,
} from '@/lib/feed-photo';

describe('readLoadedImageSize', () => {
  it('reads React Native source width/height', () => {
    expect(readLoadedImageSize({ source: { width: 1600, height: 900 } })).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it('reads the browser image target used by RN-web', () => {
    expect(readLoadedImageSize({ target: { naturalWidth: 800, naturalHeight: 400 } })).toEqual({
      width: 800,
      height: 400,
    });
  });

  it('unwraps a nested nativeEvent from ImageLoader', () => {
    expect(
      readLoadedImageSize({ nativeEvent: { target: { naturalWidth: 640, naturalHeight: 480 } } })
    ).toEqual({ width: 640, height: 480 });
  });
});

describe('feedPhotoAspect', () => {
  it('returns width / height for landscape, portrait, and square', () => {
    expect(feedPhotoAspect(1600, 900)).toBeCloseTo(16 / 9);
    expect(feedPhotoAspect(900, 1600)).toBeCloseTo(9 / 16);
    expect(feedPhotoAspect(800, 800)).toBe(1);
  });

  it('falls back to 4:3 when size is missing', () => {
    expect(feedPhotoAspect(0, 900)).toBe(FEED_PHOTO_FALLBACK_ASPECT);
    expect(feedPhotoAspect(1600, 0)).toBe(FEED_PHOTO_FALLBACK_ASPECT);
  });
});

describe('feedPhotoDisplayHeight', () => {
  it('follows width × natural aspect for landscape photos', () => {
    expect(feedPhotoDisplayHeight(360, 16 / 9)).toBeCloseTo(360 / (16 / 9));
  });

  it('caps very tall photos instead of stretching the row', () => {
    const tall = feedPhotoDisplayHeight(360, 9 / 16);
    expect(tall).toBe(FEED_PHOTO_MAX_HEIGHT);
    expect(tall).toBeLessThan(360 / (9 / 16));
  });

  it('does not invent a square crop box', () => {
    const landscape = feedPhotoDisplayHeight(400, 16 / 9);
    const portrait = feedPhotoDisplayHeight(400, 3 / 4);
    expect(landscape).not.toBe(portrait);
    expect(landscape).toBeLessThan(400);
  });

  it('returns no height until the row width is known', () => {
    expect(feedPhotoDisplayHeight(0, 16 / 9)).toBe(0);
  });
});
