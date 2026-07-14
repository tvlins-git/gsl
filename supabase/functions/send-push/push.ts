export interface PushRecipient {
  userId: string;
  token: string;
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export function filterRecipients(
  tokens: PushRecipient[],
  excludeUserIds: string[] = []
): PushRecipient[] {
  const exclude = new Set(excludeUserIds);
  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (exclude.has(t.userId)) return false;
    if (seen.has(t.token)) return false;
    seen.add(t.token);
    return true;
  });
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
