import { parseNotificationData, getDeepLinkPath, registerForPushNotifications, subscribeToNotificationResponses } from '@/lib/notifications';
import { isExpoGoRuntime } from '@/lib/runtime';

jest.mock('@/lib/runtime', () => ({
  isExpoGoRuntime: jest.fn(),
}));

const mockIsExpoGoRuntime = isExpoGoRuntime as jest.MockedFunction<typeof isExpoGoRuntime>;

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

describe('Expo Go notification guards', () => {
  beforeEach(() => {
    mockIsExpoGoRuntime.mockReturnValue(true);
  });

  it('skips push registration in Expo Go', async () => {
    await expect(registerForPushNotifications('user-1')).resolves.toBeNull();
  });

  it('skips notification response listeners in Expo Go', async () => {
    const unsubscribe = await subscribeToNotificationResponses(jest.fn());
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
