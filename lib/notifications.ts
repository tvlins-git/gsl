import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { isExpoGoRuntime } from './runtime';
import { supabase } from './supabase';

type NotificationsModule = typeof import('expo-notifications');

let nativeNotifications: NotificationsModule | null | undefined;
let handlerConfigured = false;

async function loadNativeNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGoRuntime()) return null;
  if (nativeNotifications !== undefined) return nativeNotifications;

  try {
    nativeNotifications = await import('expo-notifications');
  } catch {
    nativeNotifications = null;
    return null;
  }

  if (nativeNotifications && !handlerConfigured) {
    nativeNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  return nativeNotifications;
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (isExpoGoRuntime()) return null;
  if (!Device.isDevice) return null;

  const Notifications = await loadNativeNotifications();
  if (!Notifications) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  const platform = Platform.OS as 'ios' | 'android' | 'web';

  await supabase.from('device_tokens').upsert(
    { user_id: userId, expo_push_token: token, platform },
    { onConflict: 'user_id,expo_push_token' }
  );

  return token;
}

export async function subscribeToNotificationResponses(
  listener: (data: Record<string, unknown>) => void
): Promise<() => void> {
  if (isExpoGoRuntime()) return () => undefined;

  const Notifications = await loadNativeNotifications();
  if (!Notifications) return () => undefined;

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    listener(response.notification.request.content.data as Record<string, unknown>);
  });
  return () => sub.remove();
}

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
