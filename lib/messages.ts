import type { Message } from './database.types';

const OPTIMISTIC_ID_PREFIX = 'optimistic-';

export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export function createOptimisticMessage(
  threadId: string,
  senderId: string,
  body: string,
  now = new Date()
): Message {
  return {
    id: `${OPTIMISTIC_ID_PREFIX}${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    thread_id: threadId,
    sender_id: senderId,
    body,
    created_at: now.toISOString(),
  };
}

/** Merge incoming messages, drop optimistic twins, and keep chronological order. */
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();

  for (const msg of existing) {
    byId.set(msg.id, msg);
  }

  for (const msg of incoming) {
    if (!isOptimisticMessageId(msg.id)) {
      for (const [id, prev] of byId) {
        if (
          isOptimisticMessageId(id) &&
          prev.sender_id === msg.sender_id &&
          prev.body === msg.body
        ) {
          byId.delete(id);
        }
      }
    }
    byId.set(msg.id, msg);
  }

  return sortMessagesChronologically([...byId.values()]);
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const sorted = sortMessagesChronologically(messages);
  const groups: { date: string; messages: Message[] }[] = [];

  for (const msg of sorted) {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
  }

  return groups;
}
