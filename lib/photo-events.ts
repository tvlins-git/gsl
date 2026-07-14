import type { PhotoEvent } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export type PhotoEventSummary = {
  event: PhotoEvent;
  photoCount: number;
};

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
  const { data: photos } = await supabase.from('photos').select('event_id').in('event_id', eventIds);

  const counts = new Map<string, number>();
  for (const photo of photos ?? []) {
    counts.set(photo.event_id, (counts.get(photo.event_id) ?? 0) + 1);
  }

  return eventList.map((event) => ({
    event,
    photoCount: counts.get(event.id) ?? 0,
  }));
}
