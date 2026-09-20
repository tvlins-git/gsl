import type { Photo } from './database.types';

export const ALBUM_FEED_THUMB_MAX = 3;

export type AlbumPreviewPhoto = Pick<Photo, 'id' | 'storage_path' | 'thumb_path' | 'uploaded_by'>;

export function hasAlbumPreviewSource(photo: Pick<Photo, 'storage_path' | 'thumb_path'>) {
  return Boolean(photo.thumb_path || photo.storage_path);
}

export function selectAlbumPreviewPhotos(
  photos: Pick<Photo, 'id' | 'storage_path' | 'thumb_path' | 'uploaded_by' | 'ai_score' | 'created_at'>[],
  limit = ALBUM_FEED_THUMB_MAX
): AlbumPreviewPhoto[] {
  return photos
    .filter(hasAlbumPreviewSource)
    .slice()
    .sort((a, b) => {
      const scoreDiff = (b.ai_score ?? -1) - (a.ai_score ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit)
    .map((photo) => ({
      id: photo.id,
      storage_path: photo.storage_path,
      thumb_path: photo.thumb_path,
      uploaded_by: photo.uploaded_by,
    }));
}
