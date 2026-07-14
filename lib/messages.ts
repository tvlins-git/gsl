import type { Message } from './database.types';

export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
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
