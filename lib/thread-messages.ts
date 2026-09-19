import type { Message } from './database.types';
import { isLocalMode, localStore } from './local-store';
import { supabase } from './supabase';

export async function listThreadMessages(threadId: string): Promise<Message[]> {
  if (isLocalMode()) {
    return localStore.getMessages(threadId);
  }

  const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId);
  if (error) throw error;
  return data ?? [];
}

export async function sendThreadMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<Message> {
  if (isLocalMode()) {
    return localStore.addMessage(threadId, senderId, body);
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select('*')
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error('Message insert returned no row');
  }
  return data;
}
