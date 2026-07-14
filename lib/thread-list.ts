import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export async function deleteThread(threadId: string) {
  if (isLocalMode()) {
    await localStore.deleteThread(threadId);
    return;
  }

  const { error } = await supabase.from('threads').delete().eq('id', threadId);
  if (error) throw error;
}
