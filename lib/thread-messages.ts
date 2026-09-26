import type { Message } from './database.types';
import { parseFeedMentions, type FeedMentionMember } from './feed-posts';
import { isLocalMode, localStore } from './local-store';
import { parseNotificationPreference } from './notification-prefs';
import { supabase } from './supabase';

/** `null` notifies the whole group. A list notifies only those people. */
export function resolveChatNotifyUserIds(
  body: string,
  members: FeedMentionMember[],
  senderId: string
): string[] | null {
  const tags = parseFeedMentions(body, members);
  if (tags.tagAll) return null;
  const userIds = tags.userIds.filter((userId) => userId !== senderId);
  return userIds.length > 0 ? userIds : null;
}

/** True when the message contains @everyone or at least one @name tag. */
export function isChatTagNotification(
  body: string,
  members: FeedMentionMember[],
  senderId: string
): boolean {
  const tags = parseFeedMentions(body, members);
  if (tags.tagAll) return true;
  return tags.userIds.some((userId) => userId !== senderId);
}

export type ChatPushMember = FeedMentionMember & {
  notification_preference?: string | null;
};

export function resolveChatPushAudience(
  text: string,
  members: ChatPushMember[],
  senderId: string
): { userIds: string[] | null; tagNotification: boolean } {
  const tagNotification = isChatTagNotification(text, members, senderId);
  if (tagNotification) {
    return {
      userIds: resolveChatNotifyUserIds(text, members, senderId),
      tagNotification: true,
    };
  }

  const userIds = members
    .filter(
      (member) =>
        member.user_id !== senderId &&
        parseNotificationPreference(member.notification_preference) === 'all'
    )
    .map((member) => member.user_id);

  return { userIds, tagNotification: false };
}

export function shouldSendChatPush(audience: { userIds: string[] | null; tagNotification: boolean }) {
  if (audience.tagNotification) {
    return audience.userIds == null || audience.userIds.length > 0;
  }
  return audience.userIds.length > 0;
}

export function buildChatPushPayload(input: {
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  threadId: string;
  members: ChatPushMember[];
}) {
  const audience = resolveChatPushAudience(input.text, input.members, input.senderId);
  return {
    type: 'chat' as const,
    group_id: input.groupId,
    exclude_user_ids: [input.senderId],
    ...(audience.userIds != null ? { user_ids: audience.userIds } : {}),
    tag_notification: audience.tagNotification,
    title: 'GSL',
    body: `${input.senderName}: ${input.text}`,
    data: { threadId: input.threadId },
  };
}

export async function listThreadMessages(threadId: string): Promise<Message[]> {
  if (isLocalMode()) {
    return localStore.getMessages(threadId);
  }

  const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId);
  if (error) throw error;
  return data ?? [];
}

export async function sendThreadMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<Message> {
  if (isLocalMode()) {
    return localStore.addMessage(threadId, senderId, body);
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select('*')
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error('Message insert returned no row');
  }
  return data;
}
