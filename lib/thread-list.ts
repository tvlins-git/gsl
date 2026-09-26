import type { Thread } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export async function getThread(threadId: string): Promise<Thread | null> {
  if (isLocalMode()) {
    return localStore.getThread(threadId);
  }

  const { data, error } = await supabase.from('threads').select('*').eq('id', threadId).single();
  if (error || !data) return null;
  return data;
}

export async function deleteThread(threadId: string) {
  if (isLocalMode()) {
    await localStore.deleteThread(threadId);
    return;
  }

  const { error } = await supabase.from('threads').delete().eq('id', threadId);
  if (error) throw error;
}
