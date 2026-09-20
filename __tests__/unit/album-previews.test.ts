import { selectAlbumPreviewPhotos } from '@/lib/album-previews';
import { buildPhoto } from '../factories';

describe('selectAlbumPreviewPhotos', () => {
  it('returns an empty list when there are no photo files', () => {
    expect(selectAlbumPreviewPhotos([])).toEqual([]);
    expect(
      selectAlbumPreviewPhotos([
        buildPhoto({ storage_path: '', thumb_path: null }),
      ])
    ).toEqual([]);
  });

  it('keeps the top three by score, then recency, using real storage paths', () => {
    const photos = [
      buildPhoto({
        id: 'low',
        storage_path: 'file://low.jpg',
        thumb_path: 'file://low-thumb.jpg',
        ai_score: 0.1,
        created_at: '2026-09-03T10:00:00.000Z',
      }),
      buildPhoto({
        id: 'best',
        storage_path: 'file://best.jpg',
        thumb_path: 'file://best-thumb.jpg',
        ai_score: 0.9,
        created_at: '2026-09-01T10:00:00.000Z',
      }),
      buildPhoto({
        id: 'mid',
        storage_path: 'file://mid.jpg',
        thumb_path: null,
        ai_score: 0.5,
        created_at: '2026-09-02T10:00:00.000Z',
      }),
      buildPhoto({
        id: 'fourth',
        storage_path: 'file://fourth.jpg',
        thumb_path: 'file://fourth-thumb.jpg',
        ai_score: 0.2,
        created_at: '2026-09-04T10:00:00.000Z',
      }),
    ];

    expect(selectAlbumPreviewPhotos(photos).map((photo) => photo.id)).toEqual([
      'best',
      'mid',
      'fourth',
    ]);
  });
});
