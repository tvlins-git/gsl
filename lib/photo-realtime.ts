import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Photo } from './database.types';
import { supabase } from './supabase';

type InsertListener = (photo: Photo) => void;

type AlbumSubscription = {
  listeners: Set<InsertListener>;
  started: boolean;
  channel: RealtimeChannel | null;
};

const subscriptions = new Map<string, AlbumSubscription>();
let topicSequence = 0;

function channelIsLive(channel: { state?: string }): boolean {
  return channel.state === 'joining' || channel.state === 'joined' || channel.state === 'leaving';
}

function openInsertChannel(eventId: string, deliver: (photo: Photo) => void): RealtimeChannel | null {
  const filter = {
    event: 'INSERT' as const,
    schema: 'public',
    table: 'photos',
    filter: `event_id=eq.${eventId}`,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    topicSequence += 1;
    const topic = `album-${eventId}-${topicSequence}`;
    let channel: RealtimeChannel;
    try {
      channel = supabase.channel(topic);
    } catch {
      return null;
    }

    if (channelIsLive(channel)) continue;

    try {
      channel
        .on('postgres_changes', filter, (payload) => {
          deliver(payload.new as Photo);
        })
        .subscribe();
      return channel;
    } catch {
      return null;
    }
  }

  return null;
}

function deliverToListeners(entry: AlbumSubscription, photo: Photo) {
  if (!photo) return;
  for (const listener of [...entry.listeners]) {
    try {
      listener(photo);
    } catch {
      // Listener errors must not break the album screen.
    }
  }
}

function ensureSubscribed(eventId: string, entry: AlbumSubscription) {
  if (entry.started) return;
  entry.started = true;
  try {
    entry.channel = openInsertChannel(eventId, (photo) => deliverToListeners(entry, photo));
  } catch {
    entry.channel = null;
  }
}

export function subscribeToAlbumPhotoInserts(eventId: string, onInsert: InsertListener): () => void {
  let entry = subscriptions.get(eventId);
  if (!entry) {
    entry = { listeners: new Set(), started: false, channel: null };
    subscriptions.set(eventId, entry);
  }
  entry.listeners.add(onInsert);

  try {
    ensureSubscribed(eventId, entry);
  } catch {
    // Live updates are optional; fetched photos still render.
  }

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const current = subscriptions.get(eventId);
    if (!current) return;
    current.listeners.delete(onInsert);
    if (current.listeners.size > 0) return;

    subscriptions.delete(eventId);
    const channel = current.channel;
    current.channel = null;
    if (!channel) return;
    try {
      void Promise.resolve(supabase.removeChannel(channel)).catch(() => undefined);
    } catch {
      // Cleanup must not surface as a screen error.
    }
  };
}

/** Drops in-memory listener state. Test isolation only. */
export function resetPhotoRealtimeForTests(): void {
  subscriptions.clear();
  topicSequence = 0;
}
