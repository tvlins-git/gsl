/** Push notification preference stored on members. */
export type NotificationPreference = 'off' | 'tagged' | 'all';

export const NOTIFICATION_PREFERENCE_DEFAULT: NotificationPreference = 'all';

export const NOTIFICATION_PREFERENCE_OPTIONS: {
  value: NotificationPreference;
  label: string;
  hint: string;
}[] = [
  {
    value: 'off',
    label: 'No notifications',
    hint: 'Never send push notifications to this device.',
  },
  {
    value: 'tagged',
    label: 'Tagged only',
    hint: 'Only when you are @mentioned, or when someone uses @everyone.',
  },
  {
    value: 'all',
    label: 'All messages',
    hint: 'All chat and other activity the app already notifies about.',
  },
];

export function parseNotificationPreference(value: unknown): NotificationPreference {
  if (value === 'off' || value === 'tagged' || value === 'all') return value;
  return NOTIFICATION_PREFERENCE_DEFAULT;
}

/**
 * Whether a recipient should get this push after include/exclude targeting.
 * `tagNotification` is true for @mention / @everyone / feed tags (including tag_all).
 */
export function shouldReceivePushForPreference(
  preference: NotificationPreference,
  tagNotification: boolean
): boolean {
  if (preference === 'off') return false;
  if (preference === 'all') return true;
  return tagNotification;
}

export function filterRecipientsByPreference<T extends { userId: string }>(
  recipients: T[],
  preferenceByUserId: Map<string, NotificationPreference> | Record<string, NotificationPreference>,
  tagNotification: boolean
): T[] {
  const getPref = (userId: string): NotificationPreference => {
    if (preferenceByUserId instanceof Map) {
      return preferenceByUserId.get(userId) ?? NOTIFICATION_PREFERENCE_DEFAULT;
    }
    return preferenceByUserId[userId] ?? NOTIFICATION_PREFERENCE_DEFAULT;
  };

  return recipients.filter((recipient) =>
    shouldReceivePushForPreference(getPref(recipient.userId), tagNotification)
  );
}
