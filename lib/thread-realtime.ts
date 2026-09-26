import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from './database.types';
import { supabase } from './supabase';

type InsertListener = (message: Message) => void;

type ThreadSubscription = {
  listeners: Set<InsertListener>;
  /** Set before bind so a second caller cannot enter `.on()` while the first is still subscribing. */
  started: boolean;
  channel: RealtimeChannel | null;
};

const subscriptions = new Map<string, ThreadSubscription>();
let topicSequence = 0;

function channelIsLive(channel: { state?: string }): boolean {
  return channel.state === 'joining' || channel.state === 'joined' || channel.state === 'leaving';
}

/**
 * Supabase throws if `postgres_changes` is added to a channel that has already
 * subscribed. Never call `.on()` unless this channel is still closed.
 */
function openInsertChannel(threadId: string, deliver: (message: Message) => void): RealtimeChannel | null {
  const filter = {
    event: 'INSERT' as const,
    schema: 'public',
    table: 'messages',
    filter: `thread_id=eq.${threadId}`,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    topicSequence += 1;
    const topic = `thread-${threadId}-${topicSequence}`;
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
          deliver(payload.new as Message);
        })
        .subscribe();
      return channel;
    } catch {
      return null;
    }
  }

  return null;
}

function deliverToListeners(entry: ThreadSubscription, message: Message) {
  if (!message) return;
  for (const listener of [...entry.listeners]) {
    try {
      listener(message);
    } catch {
      // A listener must not take down the thread screen.
    }
  }
}

function ensureSubscribed(threadId: string, entry: ThreadSubscription) {
  if (entry.started) return;
  entry.started = true;
  try {
    entry.channel = openInsertChannel(threadId, (message) => deliverToListeners(entry, message));
  } catch {
    entry.channel = null;
  }
}

/**
 * Listen for new messages in a thread.
 * One channel is shared by every listener. A second Open chat joins that set
 * instead of calling `.on()` again after `subscribe()`.
 */
export function subscribeToThreadInserts(threadId: string, onInsert: InsertListener): () => void {
  let entry = subscriptions.get(threadId);
  if (!entry) {
    entry = { listeners: new Set(), started: false, channel: null };
    subscriptions.set(threadId, entry);
  }
  entry.listeners.add(onInsert);

  try {
    ensureSubscribed(threadId, entry);
  } catch {
    // Live updates are optional. The thread still renders fetched messages.
  }

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const current = subscriptions.get(threadId);
    if (!current) return;
    current.listeners.delete(onInsert);
    if (current.listeners.size > 0) return;

    subscriptions.delete(threadId);
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
export function resetThreadRealtimeForTests(): void {
  subscriptions.clear();
  topicSequence = 0;
}
