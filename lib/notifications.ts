export type NotificationDeepLink =
  | { type: 'chat'; threadId: string }
  | { type: 'plan'; pollId: string }
  | { type: 'hosts' }
  | { type: 'photos'; eventId?: string };

export function parseNotificationData(data: Record<string, unknown>): NotificationDeepLink | null {
  const type = data.type as string | undefined;
  if (!type) return null;

  switch (type) {
    case 'chat':
      return data.threadId ? { type: 'chat', threadId: String(data.threadId) } : null;
    case 'poll':
      return data.pollId ? { type: 'plan', pollId: String(data.pollId) } : null;
    case 'hosts':
      return { type: 'hosts' };
    case 'photos':
      return { type: 'photos', eventId: data.eventId ? String(data.eventId) : undefined };
    default:
      return null;
  }
}

export function getDeepLinkPath(link: NotificationDeepLink): string {
  switch (link.type) {
    case 'chat':
      return `/thread/${link.threadId}`;
    case 'plan':
      return `/plan?pollId=${link.pollId}`;
    case 'hosts':
      return '/hosts';
    case 'photos':
      return link.eventId ? `/photos?eventId=${link.eventId}` : '/photos';
  }
}
