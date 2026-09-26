import type { NotificationDeepLink } from './notifications';
import { parseNotificationData, getDeepLinkPath } from './notifications';
import { emitNotificationOpen } from './notification-refresh';

export function notificationDataFromResponse(
  data: Record<string, unknown> | undefined
): NotificationDeepLink | null {
  if (!data) return null;
  return parseNotificationData(data);
}

/** Notify listeners first so lists refresh before/alongside navigation. */
export function handleNotificationOpen(
  link: NotificationDeepLink,
  navigate: (path: string) => void
) {
  emitNotificationOpen(link);
  navigate(getDeepLinkPath(link));
}
