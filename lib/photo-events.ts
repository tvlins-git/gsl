import type { Photo, PhotoEvent } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export type PhotoEventCover = Pick<Photo, 'id' | 'storage_path' | 'thumb_path' | 'uploaded_by'>;

export type PhotoEventSummary = {
  event: PhotoEvent;
  photoCount: number;
  coverPhoto: PhotoEventCover | null;
  latestPhotoAt: string | null;
};

export function getPhotoPublicUrl(
  photo: Pick<Photo, 'storage_path' | 'thumb_path'>,
  thumb = false
) {
  if (isLocalMode()) {
    return thumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;
  }
  const path = thumb && photo.thumb_path ? photo.thumb_path : photo.storage_path;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
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

  const counts = new Map<string, number>();
  const covers = new Map<string, PhotoEventCover>();
  const latest = new Map<string, string>();
  for (const photo of photos ?? []) {
    counts.set(photo.event_id, (counts.get(photo.event_id) ?? 0) + 1);
    if (!covers.has(photo.event_id)) {
      covers.set(photo.event_id, {
        id: photo.id,
        storage_path: photo.storage_path,
        thumb_path: photo.thumb_path,
        uploaded_by: photo.uploaded_by,
      });
    }
    const prev = latest.get(photo.event_id);
    if (!prev || photo.created_at > prev) {
      latest.set(photo.event_id, photo.created_at);
    }
  }

  return eventList.map((event) => ({
    event,
    photoCount: counts.get(event.id) ?? 0,
    coverPhoto: covers.get(event.id) ?? null,
    latestPhotoAt: latest.get(event.id) ?? null,
  }));
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
