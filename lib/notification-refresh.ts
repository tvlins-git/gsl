import type { NotificationDeepLink } from './notifications';

type OpenListener = (link: NotificationDeepLink) => void;

const listeners = new Set<OpenListener>();
/** Lets screens that mount after navigation still react to the same tap. */
let lastOpened: NotificationDeepLink | null = null;
let lastOpenedAtMs = 0;

const STICKY_MS = 60_000;

export function emitNotificationOpen(link: NotificationDeepLink) {
  lastOpened = link;
  lastOpenedAtMs = Date.now();
  for (const listener of [...listeners]) {
    try {
      listener(link);
    } catch {
      // Refresh listeners must not break navigation.
    }
  }
}

export function subscribeNotificationOpen(listener: OpenListener): () => void {
  listeners.add(listener);
  if (lastOpened && Date.now() - lastOpenedAtMs < STICKY_MS) {
    try {
      listener(lastOpened);
    } catch {
      // Same as emit.
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Activity feed includes posts, threads, polls, albums, and hosts. */
export function shouldRefreshFeedOnNotification(_link: NotificationDeepLink) {
  return true;
}

export function shouldRefreshChatListOnNotification(link: NotificationDeepLink) {
  return link.type === 'chat' || link.type === 'plan';
}

export function shouldRefreshPlanOnNotification(link: NotificationDeepLink) {
  return link.type === 'plan';
}

export function shouldRefreshPhotosOnNotification(link: NotificationDeepLink) {
  return link.type === 'photos';
}

export function shouldRefreshHostsOnNotification(link: NotificationDeepLink) {
  return link.type === 'hosts';
}

export function shouldRefreshThreadOnNotification(link: NotificationDeepLink, threadId: string) {
  return link.type === 'chat' && link.threadId === threadId;
}

/** Test isolation only. */
export function resetNotificationRefreshForTests() {
  listeners.clear();
  lastOpened = null;
  lastOpenedAtMs = 0;
}
