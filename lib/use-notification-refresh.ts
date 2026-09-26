import { useEffect } from 'react';
import type { NotificationDeepLink } from './notifications';
import { subscribeNotificationOpen } from './notification-refresh';

export function useNotificationRefresh(
  shouldRefresh: (link: NotificationDeepLink) => boolean,
  refresh: () => void | Promise<void>
) {
  useEffect(() => {
    return subscribeNotificationOpen((link) => {
      if (shouldRefresh(link)) {
        void refresh();
      }
    });
  }, [shouldRefresh, refresh]);
}
