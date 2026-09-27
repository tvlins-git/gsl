import {
  buildChatPushPayload,
  listThreadMessages,
  resolveChatNotifyUserIds,
  resolveChatPushAudience,
  sendThreadMessage,
  shouldSendChatPush,
} from '@/lib/thread-messages';
import { supabase } from '@/lib/supabase';
import { buildMessage } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: () => false,
  localStore: {
    getMessages: jest.fn(),
    addMessage: jest.fn(),
  },
}));

function mockQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock | ((onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>)> = {};
  const self = () => query;
  query.select = jest.fn(self);
  query.insert = jest.fn(self);
  query.eq = jest.fn(self);
  query.order = jest.fn(self);
  query.limit = jest.fn(self);
  query.single = jest.fn(async () => result);
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

describe('sendThreadMessage', () => {
  it('inserts and returns the saved row on the supabase path', async () => {
    const saved = buildMessage({ id: 'saved-1', body: 'See you Friday' });
    const query = mockQuery({ data: saved, error: null });
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await sendThreadMessage('thread-1', 'user-1', 'See you Friday');

    expect(supabase.from).toHaveBeenCalledWith('messages');
    expect(query.insert).toHaveBeenCalledWith({
      thread_id: 'thread-1',
      sender_id: 'user-1',
      body: 'See you Friday',
    });
    expect(result).toEqual(saved);
  });

  it('throws when insert does not return a row', async () => {
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: null, error: null }));
    await expect(sendThreadMessage('thread-1', 'user-1', 'Nope')).rejects.toThrow(
      'Message insert returned no row'
    );
  });
});

describe('chat mention notifications', () => {
  const members = [
    { user_id: 'user-1', display_name: 'Hr. Lins', notification_preference: 'all' as const },
    { user_id: 'user-2', display_name: 'Thomas', notification_preference: 'tagged' as const },
    { user_id: 'user-3', display_name: 'Diana', notification_preference: 'tagged' as const },
    { user_id: 'user-4', display_name: 'Test', notification_preference: 'off' as const },
  ];

  it('targets only members on all for untagged chat messages', () => {
    expect(resolveChatNotifyUserIds('See you Friday', members, 'user-1')).toBeNull();
    const audience = resolveChatPushAudience('See you Friday', members, 'user-1');
    expect(audience).toEqual({ userIds: [], tagNotification: false });
    expect(shouldSendChatPush(audience)).toBe(false);
    const payload = buildChatPushPayload({
      groupId: 'group-1',
      senderId: 'user-1',
      senderName: 'Hr. Lins',
      text: 'See you Friday',
      threadId: 'thread-1',
      members,
    });
    expect(payload.user_ids).toEqual([]);
    expect(payload.tag_notification).toBe(false);
    expect(payload.exclude_user_ids).toEqual(['user-1']);
  });

  it('never puts the author in the audience when they write a plain hello', () => {
    const audience = resolveChatPushAudience('Hi Hr. Lins', members, 'user-3');
    expect(audience.tagNotification).toBe(false);
    expect(audience.userIds).toEqual(['user-1']);
    expect(audience.userIds).not.toContain('user-3');
    expect(shouldSendChatPush(audience)).toBe(true);
  });

  it('notifies the tagged member plus all-pref members, never the author or off', () => {
    expect(resolveChatNotifyUserIds('hi @Thomas', members, 'user-3')).toEqual(['user-2']);
    const audience = resolveChatPushAudience('hi @Thomas', members, 'user-3');
    expect(audience.tagNotification).toBe(true);
    expect(audience.userIds).toEqual(['user-1', 'user-2']);
    expect(audience.userIds).not.toContain('user-3');
    expect(audience.userIds).not.toContain('user-4');
    const payload = buildChatPushPayload({
      groupId: 'group-1',
      senderId: 'user-3',
      senderName: 'Diana',
      text: 'hi @Thomas',
      threadId: 'thread-1',
      members,
    });
    expect(payload.tag_notification).toBe(true);
    expect(payload.exclude_user_ids).toEqual(['user-3']);
    expect(payload.user_ids).toEqual(['user-1', 'user-2']);
  });

  it('does not treat a self-only @mention as a tag fan-out', () => {
    const audience = resolveChatPushAudience('note to @Diana', members, 'user-3');
    expect(audience.tagNotification).toBe(false);
    expect(audience.userIds).toEqual(['user-1']);
  });

  it('notifies the whole group for @everyone and @everybody', () => {
    expect(resolveChatNotifyUserIds('hi @everyone', members, 'user-1')).toBeNull();
    expect(resolveChatNotifyUserIds('hi @everybody', members, 'user-1')).toBeNull();
    expect(
      buildChatPushPayload({
        groupId: 'group-1',
        senderId: 'user-1',
        senderName: 'Hr. Lins',
        text: 'hi @everyone',
        threadId: 'thread-1',
        members,
      }).tag_notification
    ).toBe(true);
    expect(
      buildChatPushPayload({
        groupId: 'group-1',
        senderId: 'user-1',
        senderName: 'Hr. Lins',
        text: 'hi @everybody',
        threadId: 'thread-1',
        members,
      }).user_ids
    ).toBeUndefined();
  });
});

describe('listThreadMessages', () => {
  it('returns messages for a thread from supabase', async () => {
    const rows = [buildMessage({ id: 'm1' })];
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: rows, error: null }));
    await expect(listThreadMessages('thread-1')).resolves.toEqual(rows);
  });
});
