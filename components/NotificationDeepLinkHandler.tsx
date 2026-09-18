import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getDeepLinkPath, parseNotificationData } from '@/lib/notifications';

export function NotificationDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const link = parseNotificationData(data);
      if (link) router.push(getDeepLinkPath(link) as never);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
