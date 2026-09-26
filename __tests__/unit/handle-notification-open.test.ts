import { handleNotificationOpen } from '@/lib/handle-notification-open';
import { resetNotificationRefreshForTests, subscribeNotificationOpen } from '@/lib/notification-refresh';

describe('handleNotificationOpen', () => {
  beforeEach(() => {
    resetNotificationRefreshForTests();
  });

  it('emits refresh before navigating', () => {
    const order: string[] = [];
    subscribeNotificationOpen(() => {
      order.push('refresh');
    });
    handleNotificationOpen({ type: 'chat', threadId: 'thread-9' }, (path) => {
      order.push(`nav:${path}`);
    });
    expect(order).toEqual(['refresh', 'nav:/thread/thread-9']);
  });
});
