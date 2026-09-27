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
    hint: 'Only when you are @mentioned, or when someone uses @everyone / @everybody.',
  },
  {
    value: 'all',
    label: 'All messages',
    hint: 'Every chat message from others, plus Feed tags (never your own posts).',
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

/**
 * Server/client shared guard: a chat push body like `Name: Hi` is never a tag
 * event even if `tag_notification` was set true by a stale client.
 */
export function inferTagNotification(input: {
  type?: string;
  tagNotification?: unknown;
  body?: unknown;
}): boolean {
  const claimed = Boolean(input.tagNotification);
  if (!claimed) return false;
  if (input.type === 'feed') return true;

  const text = typeof input.body === 'string' ? input.body : '';
  const colon = text.indexOf(': ');
  const message = colon >= 0 ? text.slice(colon + 2) : text;
  if (/(^|[^\p{L}\p{N}])@(everyone|everybody)\b/iu.test(message)) return true;
  if (/(^|[^\p{L}\p{N}])@[\p{L}][\p{L}\p{N}._-]*/u.test(message)) return true;
  return false;
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
