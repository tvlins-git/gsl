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
});

describe('getDeepLinkPath', () => {
  it('builds chat deep link', () => {
    expect(getDeepLinkPath({ type: 'chat', threadId: 't1' })).toBe('/thread/t1');
  });

  it('builds hosts deep link', () => {
    expect(getDeepLinkPath({ type: 'hosts' })).toBe('/hosts');
  });
});
