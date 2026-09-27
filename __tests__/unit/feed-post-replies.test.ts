import {
  buildFeedReplyPushPayload,
  canDeleteFeedPostReply,
  canSubmitFeedPostReply,
  createOptimisticReply,
  formatReplyCount,
  listFeedPostReplies,
  mergeReplies,
  sendFeedPostReply,
  shouldSendFeedReplyPush,
  sortRepliesChronologically,
} from '@/lib/feed-post-replies';
import { supabase } from '@/lib/supabase';
import type { FeedPostReply } from '@/lib/database.types';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: () => false,
  localStore: {
    getFeedPostReplies: jest.fn(),
    addFeedPostReply: jest.fn(),
    getFeedReplyCounts: jest.fn(),
    getFeedPostById: jest.fn(),
    deleteFeedPostReply: jest.fn(),
  },
}));

function mockQuery(result: { data: unknown; error: unknown }) {
  const query: Record<
    string,
    jest.Mock | ((onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>)
  > = {};
  const self = () => query;
  query.select = jest.fn(self);
  query.insert = jest.fn(self);
  query.eq = jest.fn(self);
  query.order = jest.fn(self);
  query.in = jest.fn(self);
  query.maybeSingle = jest.fn(async () => result);
  query.single = jest.fn(async () => result);
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

function buildReply(overrides: Partial<FeedPostReply> = {}): FeedPostReply {
  return {
    id: 'reply-1',
    post_id: 'post-1',
    author_id: 'user-1',
    body: 'Nice!',
    created_at: '2026-09-27T12:00:00.000Z',
    ...overrides,
  };
}

describe('feed post reply helpers', () => {
  it('requires non-empty reply text', () => {
    expect(canSubmitFeedPostReply('  ')).toBe(false);
    expect(canSubmitFeedPostReply('hello')).toBe(true);
  });

  it('only lets authors delete their own replies', () => {
    expect(canDeleteFeedPostReply('user-1', 'user-1')).toBe(true);
    expect(canDeleteFeedPostReply('user-1', 'user-2')).toBe(false);
  });

  it('formats reply counts', () => {
    expect(formatReplyCount(0)).toBeNull();
    expect(formatReplyCount(1)).toBe('1 reply');
    expect(formatReplyCount(3)).toBe('3 replies');
  });

  it('merges optimistic replies with saved rows', () => {
    const optimistic = createOptimisticReply('post-1', 'user-1', 'Nice!');
    const saved = buildReply({ id: 'saved-1', body: 'Nice!' });
    const merged = mergeReplies([optimistic], [saved]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('saved-1');
  });

  it('sorts replies oldest first', () => {
    const sorted = sortRepliesChronologically([
      buildReply({ id: 'b', created_at: '2026-09-27T13:00:00.000Z' }),
      buildReply({ id: 'a', created_at: '2026-09-27T12:00:00.000Z' }),
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['a', 'b']);
  });
});

describe('feed reply push', () => {
  const members = [
    { user_id: 'user-1', display_name: 'Hr. Lins', notification_preference: 'all' as const },
    { user_id: 'user-2', display_name: 'Thomas', notification_preference: 'tagged' as const },
    { user_id: 'user-3', display_name: 'Diana', notification_preference: 'all' as const },
    { user_id: 'user-4', display_name: 'Test', notification_preference: 'off' as const },
  ];

  it('never notifies the reply author and skips empty all-pref audiences', () => {
    const payload = buildFeedReplyPushPayload({
      groupId: 'group-1',
      authorId: 'user-1',
      authorName: 'Hr. Lins',
      text: 'See you Friday',
      postId: 'post-1',
      replyId: 'reply-1',
      members,
    });
    expect(payload.type).toBe('feed_reply');
    expect(payload.exclude_user_ids).toEqual(['user-1']);
    expect(payload.tag_notification).toBe(false);
    expect(payload.user_ids).toEqual(['user-3']);
    expect(payload.data).toEqual({ postId: 'post-1', replyId: 'reply-1' });
    expect(
      shouldSendFeedReplyPush({
        userIds: payload.user_ids ?? null,
        tagNotification: payload.tag_notification,
      })
    ).toBe(true);
  });

  it('marks @mentions as tag notifications and includes all-pref members', () => {
    const payload = buildFeedReplyPushPayload({
      groupId: 'group-1',
      authorId: 'user-3',
      authorName: 'Diana',
      text: 'hi @Thomas',
      postId: 'post-1',
      replyId: 'reply-2',
      members,
    });
    expect(payload.tag_notification).toBe(true);
    expect(payload.exclude_user_ids).toEqual(['user-3']);
    expect(payload.user_ids).toEqual(['user-1', 'user-2']);
    expect(payload.user_ids).not.toContain('user-3');
    expect(payload.user_ids).not.toContain('user-4');
  });

  it('fans out @everyone without a user_ids list', () => {
    const payload = buildFeedReplyPushPayload({
      groupId: 'group-1',
      authorId: 'user-1',
      authorName: 'Hr. Lins',
      text: 'hi @everyone',
      postId: 'post-1',
      replyId: 'reply-3',
      members,
    });
    expect(payload.tag_notification).toBe(true);
    expect(payload.user_ids).toBeUndefined();
  });
});

describe('sendFeedPostReply', () => {
  it('inserts and returns the saved row on the supabase path', async () => {
    const saved = buildReply({ id: 'saved-1', body: 'See you Friday' });
    const query = mockQuery({ data: saved, error: null });
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await sendFeedPostReply('post-1', 'user-1', 'See you Friday');

    expect(supabase.from).toHaveBeenCalledWith('feed_post_replies');
    expect(query.insert).toHaveBeenCalledWith({
      post_id: 'post-1',
      author_id: 'user-1',
      body: 'See you Friday',
    });
    expect(result).toEqual(saved);
  });

  it('throws when insert does not return a row', async () => {
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: null, error: null }));
    await expect(sendFeedPostReply('post-1', 'user-1', 'Nope')).rejects.toThrow(
      'Reply insert returned no row'
    );
  });
});

describe('listFeedPostReplies', () => {
  it('returns replies for a post from supabase', async () => {
    const rows = [buildReply({ id: 'r1' })];
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: rows, error: null }));
    await expect(listFeedPostReplies('post-1')).resolves.toEqual(rows);
  });
});
