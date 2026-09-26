import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  handleNotificationOpen,
  notificationDataFromResponse,
} from '@/lib/handle-notification-open';

export function NotificationDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const navigate = (path: string) => {
      router.push(path as never);
    };

    const onResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const link = notificationDataFromResponse(data);
      if (link) handleNotificationOpen(link, navigate);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) onResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => sub.remove();
  }, [router]);

  return null;
}
