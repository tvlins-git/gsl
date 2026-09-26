import {
  filterRecipientsByPreference,
  NOTIFICATION_PREFERENCE_DEFAULT,
  parseNotificationPreference,
  shouldReceivePushForPreference,
} from '@/lib/notification-prefs';

describe('notification preferences', () => {
  it('defaults unknown values to all', () => {
    expect(parseNotificationPreference(undefined)).toBe(NOTIFICATION_PREFERENCE_DEFAULT);
    expect(parseNotificationPreference('weird')).toBe('all');
    expect(parseNotificationPreference('tagged')).toBe('tagged');
  });

  it('never notifies when preference is off', () => {
    expect(shouldReceivePushForPreference('off', false)).toBe(false);
    expect(shouldReceivePushForPreference('off', true)).toBe(false);
  });

  it('notifies tagged-only users only for tag notifications', () => {
    expect(shouldReceivePushForPreference('tagged', true)).toBe(true);
    expect(shouldReceivePushForPreference('tagged', false)).toBe(false);
  });

  it('notifies all-messages users for every existing push type', () => {
    expect(shouldReceivePushForPreference('all', false)).toBe(true);
    expect(shouldReceivePushForPreference('all', true)).toBe(true);
  });

  it('filters recipients by preference after targeting', () => {
    const recipients = [
      { userId: 'u1', token: 't1' },
      { userId: 'u2', token: 't2' },
      { userId: 'u3', token: 't3' },
    ];
    const prefs = new Map([
      ['u1', 'off' as const],
      ['u2', 'tagged' as const],
      ['u3', 'all' as const],
    ]);

    expect(
      filterRecipientsByPreference(recipients, prefs, false).map((r) => r.userId)
    ).toEqual(['u3']);
    expect(
      filterRecipientsByPreference(recipients, prefs, true).map((r) => r.userId)
    ).toEqual(['u2', 'u3']);
  });
});
