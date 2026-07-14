import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

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
