export interface PushRecipient {
  userId: string;
  token: string;
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export type NotificationPreference = 'off' | 'tagged' | 'all';

export function parseNotificationPreference(value: unknown): NotificationPreference {
  if (value === 'off' || value === 'tagged' || value === 'all') return value;
  return 'all';
}

export function shouldReceivePushForPreference(
  preference: NotificationPreference,
  tagNotification: boolean
): boolean {
  if (preference === 'off') return false;
  if (preference === 'all') return true;
  return tagNotification;
}

/**
 * Prefer the real message text over a client `tag_notification` flag.
 * Push bodies are `Display Name: message`. Untagged chat must not count as a
 * tag event even if a stale client sets `tag_notification: true`.
 */
export function inferTagNotification(input: {
  type?: string;
  tagNotification?: unknown;
  body?: unknown;
}): boolean {
  const claimed = Boolean(input.tagNotification);
  if (!claimed) return false;
  // Feed only invokes send-push when someone is tagged / tag_all.
  if (input.type === 'feed') return true;

  const text = typeof input.body === 'string' ? input.body : '';
  const colon = text.indexOf(': ');
  const message = colon >= 0 ? text.slice(colon + 2) : text;
  // Match client mention rules: @token with a non-name char before @ (emails safe).
  if (/(^|[^\p{L}\p{N}])@(everyone|everybody)\b/iu.test(message)) return true;
  if (/(^|[^\p{L}\p{N}])@[\p{L}][\p{L}\p{N}._-]*/u.test(message)) return true;
  return false;
}

/**
 * Chat audience after exclude, before Expo send.
 * - untagged: only preference `all` (ignore client user_ids so tagged-only never slips in)
 * - @name: client user_ids ∪ preference `all`
 * - @everybody (user_ids omitted): everyone except excluded; preference filter applies next
 */
export function resolveChatPushRecipients(
  tokens: PushRecipient[],
  preferenceByUserId: Map<string, NotificationPreference>,
  excludeUserIds: string[],
  userIds: string[] | null,
  tagNotification: boolean
): PushRecipient[] {
  if (!tagNotification) {
    const allPrefUserIds = [...preferenceByUserId.entries()]
      .filter(([, preference]) => preference === 'all')
      .map(([userId]) => userId);
    return filterRecipients(tokens, excludeUserIds, allPrefUserIds);
  }

  let targeted = filterRecipients(tokens, excludeUserIds, userIds);
  if (Array.isArray(userIds)) {
    const allPrefUserIds = [...preferenceByUserId.entries()]
      .filter(([, preference]) => preference === 'all')
      .map(([userId]) => userId);
    targeted = mergeRecipients(
      targeted,
      filterRecipients(tokens, excludeUserIds, allPrefUserIds)
    );
  }
  return targeted;
}

export function filterRecipients(
  tokens: PushRecipient[],
  excludeUserIds: string[] = [],
  includeUserIds?: string[] | null
): PushRecipient[] {
  const exclude = new Set(excludeUserIds);
  const include = includeUserIds ? new Set(includeUserIds) : null;
  // Exclude authors by user_id only. Shared Expo tokens (same phone, multiple
  // accounts) must still deliver to the recipient — dropping the token because
  // the author also registered it wiped almost all pushes on TestFlight.
  // Deduplicate by token so one physical device gets one Expo delivery.
  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (exclude.has(t.userId)) return false;
    if (include && !include.has(t.userId)) return false;
    if (seen.has(t.token)) return false;
    seen.add(t.token);
    return true;
  });
}

/** Merge recipient lists, keeping first occurrence of each token. */
export function mergeRecipients(primary: PushRecipient[], extra: PushRecipient[]): PushRecipient[] {
  const seen = new Set(primary.map((r) => r.token));
  const merged = [...primary];
  for (const recipient of extra) {
    if (seen.has(recipient.token)) continue;
    seen.add(recipient.token);
    merged.push(recipient);
  }
  return merged;
}

export function filterRecipientsByPreference(
  recipients: PushRecipient[],
  preferenceByUserId: Map<string, NotificationPreference>,
  tagNotification: boolean
): PushRecipient[] {
  return recipients.filter((recipient) =>
    shouldReceivePushForPreference(
      preferenceByUserId.get(recipient.userId) ?? 'all',
      tagNotification
    )
  );
}

export function buildExpoPushPayload(recipients: PushRecipient[], message: PushMessage) {
  return recipients.map((r) => ({
    to: r.token,
    sound: 'default' as const,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));
}

export async function sendExpoPush(
  messages: ReturnType<typeof buildExpoPushPayload>
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) return { sent: 0, failed: 0 };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) return { sent: 0, failed: messages.length };

  const result = await response.json();
  const data = Array.isArray(result.data) ? result.data : [];
  const sent = data.filter((d: { status: string }) => d.status === 'ok').length;
  return { sent, failed: messages.length - sent };
}
