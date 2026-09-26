import {
  emitNotificationOpen,
  resetNotificationRefreshForTests,
  shouldRefreshChatListOnNotification,
  shouldRefreshFeedOnNotification,
  shouldRefreshThreadOnNotification,
  subscribeNotificationOpen,
} from '@/lib/notification-refresh';

describe('notification refresh', () => {
  beforeEach(() => {
    resetNotificationRefreshForTests();
  });

  it('notifies subscribers when a push is opened', () => {
    const seen: string[] = [];
    subscribeNotificationOpen((link) => {
      if (link.type === 'chat') seen.push(link.threadId);
    });
    emitNotificationOpen({ type: 'chat', threadId: 'thread-1' });
    expect(seen).toEqual(['thread-1']);
  });

  it('replays the latest open to late subscribers', () => {
    emitNotificationOpen({ type: 'plan', pollId: 'poll-1' });
    const seen: string[] = [];
    subscribeNotificationOpen((link) => {
      if (link.type === 'plan') seen.push(link.pollId);
    });
    expect(seen).toEqual(['poll-1']);
  });

  it('matches feed, chat list, and thread refresh rules', () => {
    expect(shouldRefreshFeedOnNotification({ type: 'hosts' })).toBe(true);
    expect(shouldRefreshChatListOnNotification({ type: 'chat', threadId: 't1' })).toBe(true);
    expect(shouldRefreshChatListOnNotification({ type: 'feed' })).toBe(false);
    expect(shouldRefreshThreadOnNotification({ type: 'chat', threadId: 't1' }, 't1')).toBe(true);
    expect(shouldRefreshThreadOnNotification({ type: 'chat', threadId: 't1' }, 't2')).toBe(false);
  });
});
