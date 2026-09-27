import { parseNotificationData, getDeepLinkPath } from '@/lib/notifications';

describe('parseNotificationData', () => {
  it('parses chat notifications', () => {
    const link = parseNotificationData({ type: 'chat', threadId: 't1' });
    expect(link).toEqual({ type: 'chat', threadId: 't1' });
  });

  it('parses poll notifications', () => {
    const link = parseNotificationData({ type: 'poll', pollId: 'p1' });
    expect(link).toEqual({ type: 'plan', pollId: 'p1' });
  });

  it('parses hosts notifications', () => {
    const link = parseNotificationData({ type: 'hosts' });
    expect(link).toEqual({ type: 'hosts' });
  });

  it('parses feed notifications', () => {
    const link = parseNotificationData({ type: 'feed', postId: 'p1' });
    expect(link).toEqual({ type: 'feed', postId: 'p1' });
    expect(getDeepLinkPath({ type: 'feed', postId: 'p1' })).toBe('/post/p1');
  });

  it('parses feed reply notifications as feed deep links', () => {
    const link = parseNotificationData({ type: 'feed_reply', postId: 'p1', replyId: 'r1' });
    expect(link).toEqual({ type: 'feed', postId: 'p1' });
    expect(getDeepLinkPath(link!)).toBe('/post/p1');
  });
});

describe('getDeepLinkPath', () => {
  it('builds chat deep link', () => {
    expect(getDeepLinkPath({ type: 'chat', threadId: 't1' })).toBe('/thread/t1');
  });

  it('builds hosts deep link', () => {
    expect(getDeepLinkPath({ type: 'hosts' })).toBe('/hosts');
  });

  it('builds feed tab path when postId is missing', () => {
    expect(getDeepLinkPath({ type: 'feed' })).toBe('/');
  });
});