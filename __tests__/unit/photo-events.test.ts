jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

import { albumThumbUris, formatEventDate, formatPhotoCount, getPhotoPublicUrl } from '@/lib/photo-events';

describe('photo-events formatters', () => {
  it('formats event date', () => {
    const formatted = formatEventDate('2026-07-13T16:00:00.000Z');
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/13/);
  });

  it('formats photo count', () => {
    expect(formatPhotoCount(0)).toBe('0 photos');
    expect(formatPhotoCount(1)).toBe('1 photo');
    expect(formatPhotoCount(5)).toBe('5 photos');
  });
});

describe('album thumb URIs', () => {
  it('uses thumbnail public paths and skips empty albums', () => {
    expect(albumThumbUris({ previewPhotos: [], coverPhoto: null })).toEqual([]);
    expect(
      albumThumbUris({
        coverPhoto: {
          id: 'p1',
          storage_path: 'file://full.jpg',
          thumb_path: 'file://thumb.jpg',
          uploaded_by: 'user-1',
        },
        previewPhotos: [
          {
            id: 'p1',
            storage_path: 'file://full.jpg',
            thumb_path: 'file://thumb.jpg',
            uploaded_by: 'user-1',
          },
          {
            id: 'p2',
            storage_path: 'file://full-2.jpg',
            thumb_path: null,
            uploaded_by: 'user-1',
          },
        ],
      })
    ).toEqual(['file://thumb.jpg', 'file://full-2.jpg']);
  });

  it('does not invent a URL when both storage paths are empty', () => {
    expect(getPhotoPublicUrl({ storage_path: '', thumb_path: null }, true)).toBe('');
  });
});
