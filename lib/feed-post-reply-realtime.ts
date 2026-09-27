import type { RealtimeChannel } from '@supabase/supabase-js';
import type { FeedPostReply } from './database.types';
import { supabase } from './supabase';

type InsertListener = (reply: FeedPostReply) => void;

type PostReplySubscription = {
  listeners: Set<InsertListener>;
  started: boolean;
  channel: RealtimeChannel | null;
};

const subscriptions = new Map<string, PostReplySubscription>();
let topicSequence = 0;

function channelIsLive(channel: { state?: string }): boolean {
  return channel.state === 'joining' || channel.state === 'joined' || channel.state === 'leaving';
}

function openInsertChannel(postId: string, deliver: (reply: FeedPostReply) => void): RealtimeChannel | null {
  const filter = {
    event: 'INSERT' as const,
    schema: 'public',
    table: 'feed_post_replies',
    filter: `post_id=eq.${postId}`,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    topicSequence += 1;
    const topic = `feed-post-replies-${postId}-${topicSequence}`;
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
          deliver(payload.new as FeedPostReply);
        })
        .subscribe();
      return channel;
    } catch {
      return null;
    }
  }

  return null;
}

function deliverToListeners(entry: PostReplySubscription, reply: FeedPostReply) {
  if (!reply) return;
  for (const listener of [...entry.listeners]) {
    try {
      listener(reply);
    } catch {
      // A listener must not take down the post thread screen.
    }
  }
}

function ensureSubscribed(postId: string, entry: PostReplySubscription) {
  if (entry.started) return;
  entry.started = true;
  try {
    entry.channel = openInsertChannel(postId, (reply) => deliverToListeners(entry, reply));
  } catch {
    entry.channel = null;
  }
}

/**
 * Listen for new replies on a feed post.
 * One channel is shared by every listener for the same post.
 */
export function subscribeToFeedPostReplyInserts(
  postId: string,
  onInsert: InsertListener
): () => void {
  let entry = subscriptions.get(postId);
  if (!entry) {
    entry = { listeners: new Set(), started: false, channel: null };
    subscriptions.set(postId, entry);
  }
  entry.listeners.add(onInsert);

  try {
    ensureSubscribed(postId, entry);
  } catch {
    // Live updates are optional.
  }

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const current = subscriptions.get(postId);
    if (!current) return;
    current.listeners.delete(onInsert);
    if (current.listeners.size > 0) return;

    subscriptions.delete(postId);
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
export function resetFeedPostReplyRealtimeForTests(): void {
  subscriptions.clear();
  topicSequence = 0;
}
