import type { Message } from './database.types';
import { supabase } from './supabase';

/**
 * Listen for new messages in a thread.
 * Each call uses its own channel. Reusing `thread-${id}` throws once that
 * channel has subscribed, which takes down the thread screen.
 */
export function subscribeToThreadInserts(
  threadId: string,
  onInsert: (message: Message) => void
): () => void {
  const topic = `thread-${threadId}-${Math.random().toString(36).slice(2)}`;
  try {
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          onInsert(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    return () => undefined;
  }
}
