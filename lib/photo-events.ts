import type { Photo, PhotoEvent } from './database.types';
import { ALBUM_FEED_THUMB_MAX, selectAlbumPreviewPhotos, type AlbumPreviewPhoto } from './album-previews';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export type PhotoEventCover = AlbumPreviewPhoto;

export type PhotoEventSummary = {
  event: PhotoEvent;
  photoCount: number;
  coverPhoto: PhotoEventCover | null;
  previewPhotos: PhotoEventCover[];
  latestPhotoAt: string | null;
};

export function getPhotoPublicUrl(
  photo: Pick<Photo, 'storage_path' | 'thumb_path'>,
  thumb = false
) {
  const path = thumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;
  if (!path) return '';
  if (isLocalMode()) {
    return path;
  }
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export function albumThumbUris(
  summary: Pick<PhotoEventSummary, 'previewPhotos' | 'coverPhoto'>
): string[] {
  const photos = summary.previewPhotos?.length
    ? summary.previewPhotos
    : summary.coverPhoto
      ? [summary.coverPhoto]
      : [];
  return photos
    .slice(0, ALBUM_FEED_THUMB_MAX)
    .map((photo) => getPhotoPublicUrl(photo, true))
    .filter((uri) => uri.length > 0);
}

export function formatEventDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPhotoCount(count: number) {
  return count === 1 ? '1 photo' : `${count} photos`;
}

export async function loadPhotoEventSummaries(groupId: string): Promise<PhotoEventSummary[]> {
  if (isLocalMode()) {
    return localStore.getPhotoEventSummaries(groupId);
  }

  const { data: events, error } = await supabase
    .from('photo_events')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const eventList = events ?? [];
  if (eventList.length === 0) return [];

  const eventIds = eventList.map((e) => e.id);
  const { data: photos } = await supabase
    .from('photos')
    .select('id, event_id, storage_path, thumb_path, uploaded_by, ai_score, created_at')
    .in('event_id', eventIds)
    .order('ai_score', { ascending: false, nullsFirst: false });

  const photosByEvent = new Map<string, NonNullable<typeof photos>>();
  for (const photo of photos ?? []) {
    const list = photosByEvent.get(photo.event_id) ?? [];
    list.push(photo);
    photosByEvent.set(photo.event_id, list);
  }

  return eventList.map((event) => {
    const eventPhotos = photosByEvent.get(event.id) ?? [];
    const previewPhotos = selectAlbumPreviewPhotos(eventPhotos);
    return {
      event,
      photoCount: eventPhotos.length,
      previewPhotos,
      coverPhoto: previewPhotos[0] ?? null,
      latestPhotoAt: eventPhotos.reduce<string | null>((latest, photo) => {
        if (!latest || photo.created_at > latest) return photo.created_at;
        return latest;
      }, null),
    };
  });
}

export async function deletePhotoEvent(eventId: string) {
  if (isLocalMode()) {
    await localStore.deletePhotoEvent(eventId);
    return;
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path, thumb_path')
    .eq('event_id', eventId);

  const paths = [...new Set(
    (photos ?? []).flatMap((p) => [p.storage_path, p.thumb_path].filter(Boolean) as string[])
  )];

  if (paths.length > 0) {
    await supabase.storage.from('photos').remove(paths).catch(() => undefined);
  }

  const { error } = await supabase.from('photo_events').delete().eq('id', eventId);
  if (error) throw error;
}
