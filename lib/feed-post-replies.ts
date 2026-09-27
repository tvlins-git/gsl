import type { FeedPostReply } from './database.types';
import { getFeedImageUrl } from './feed-posts';
import { isLocalMode, localStore } from './local-store';
import {
  resolveChatPushAudience,
  shouldSendChatPush,
  type ChatPushMember,
} from './thread-messages';
import { supabase } from './supabase';

export type { FeedPostReply };

export function canSubmitFeedPostReply(body: string) {
  return Boolean(body.trim());
}

export function canDeleteFeedPostReply(
  authorId: string | null | undefined,
  currentUserId: string | null | undefined
) {
  return Boolean(authorId && currentUserId && authorId === currentUserId);
}

export function formatReplyCount(count: number) {
  if (count <= 0) return null;
  return count === 1 ? '1 reply' : `${count} replies`;
}

export function sortRepliesChronologically(replies: FeedPostReply[]): FeedPostReply[] {
  return [...replies].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

const OPTIMISTIC_ID_PREFIX = 'optimistic-';

export function isOptimisticReplyId(id: string) {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export function createOptimisticReply(
  postId: string,
  authorId: string,
  body: string,
  now = new Date()
): FeedPostReply {
  return {
    id: `${OPTIMISTIC_ID_PREFIX}${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    post_id: postId,
    author_id: authorId,
    body,
    created_at: now.toISOString(),
  };
}

/** Merge incoming replies, drop optimistic twins, keep chronological order. */
export function mergeReplies(existing: FeedPostReply[], incoming: FeedPostReply[]): FeedPostReply[] {
  const byId = new Map<string, FeedPostReply>();

  for (const reply of existing) {
    byId.set(reply.id, reply);
  }

  for (const reply of incoming) {
    if (!isOptimisticReplyId(reply.id)) {
      for (const [id, prev] of byId) {
        if (
          isOptimisticReplyId(id) &&
          prev.author_id === reply.author_id &&
          prev.body === reply.body
        ) {
          byId.delete(id);
        }
      }
    }
    byId.set(reply.id, reply);
  }

  return sortRepliesChronologically([...byId.values()]);
}

/**
 * Feed reply push audience mirrors chat:
 * - never notify the reply author
 * - @mention / @everyone → tag_notification
 * - untagged → only preference `all`
 */
export function buildFeedReplyPushPayload(input: {
  groupId: string;
  authorId: string;
  authorName: string;
  text: string;
  postId: string;
  replyId: string;
  members: ChatPushMember[];
}) {
  const audience = resolveChatPushAudience(input.text, input.members, input.authorId);
  return {
    type: 'feed_reply' as const,
    group_id: input.groupId,
    exclude_user_ids: [input.authorId],
    ...(audience.userIds != null ? { user_ids: audience.userIds } : {}),
    tag_notification: audience.tagNotification,
    title: 'GSL',
    body: `${input.authorName}: ${input.text}`,
    data: { postId: input.postId, replyId: input.replyId },
  };
}

export function shouldSendFeedReplyPush(audience: {
  userIds: string[] | null;
  tagNotification: boolean;
}) {
  return shouldSendChatPush(audience);
}

export async function listFeedPostReplies(postId: string): Promise<FeedPostReply[]> {
  if (isLocalMode()) {
    return localStore.getFeedPostReplies(postId);
  }

  const { data, error } = await supabase
    .from('feed_post_replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FeedPostReply[];
}

export async function loadFeedReplyCounts(
  postIds: string[]
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};

  if (isLocalMode()) {
    return localStore.getFeedReplyCounts(postIds);
  }

  const { data, error } = await supabase
    .from('feed_post_replies')
    .select('post_id')
    .in('post_id', postIds);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
  }
  return counts;
}

export async function sendFeedPostReply(
  postId: string,
  authorId: string,
  body: string
): Promise<FeedPostReply> {
  const text = body.trim();
  if (!canSubmitFeedPostReply(text)) {
    throw new Error('Write a reply.');
  }

  if (isLocalMode()) {
    return localStore.addFeedPostReply(postId, authorId, text);
  }

  const { data, error } = await supabase
    .from('feed_post_replies')
    .insert({ post_id: postId, author_id: authorId, body: text })
    .select('*')
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error('Reply insert returned no row');
  }
  return data as FeedPostReply;
}

export async function deleteFeedPostReply(input: {
  replyId: string;
  authorId: string;
  currentUserId: string;
}): Promise<void> {
  if (!canDeleteFeedPostReply(input.authorId, input.currentUserId)) {
    throw new Error('You can only delete your own replies.');
  }

  if (isLocalMode()) {
    await localStore.deleteFeedPostReply(input.replyId);
    return;
  }

  const { error } = await supabase.from('feed_post_replies').delete().eq('id', input.replyId);
  if (error) throw error;
}

export async function loadFeedPostById(postId: string) {
  if (isLocalMode()) {
    return localStore.getFeedPostById(postId);
  }

  const { data: post, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!post) return null;

  const { data: tags } = await supabase
    .from('feed_post_tags')
    .select('user_id')
    .eq('post_id', postId);

  return {
    ...post,
    taggedUserIds: (tags ?? []).map((tag) => tag.user_id),
    imageUri: getFeedImageUrl(post.image_path),
  };
}
