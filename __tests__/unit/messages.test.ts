import { groupMessagesByDate, sortMessagesChronologically } from '@/lib/messages';
import { buildMessage } from '../factories';

describe('sortMessagesChronologically', () => {
  it('sorts messages oldest first', () => {
    const msgs = [
      buildMessage({ created_at: '2026-07-13T12:00:00Z' }),
      buildMessage({ created_at: '2026-07-13T10:00:00Z' }),
    ];
    const sorted = sortMessagesChronologically(msgs);
    expect(sorted[0].created_at).toBe('2026-07-13T10:00:00Z');
  });
});

describe('groupMessagesByDate', () => {
  it('groups by date', () => {
    const msgs = [
      buildMessage({ created_at: '2026-07-13T10:00:00Z' }),
      buildMessage({ created_at: '2026-07-13T12:00:00Z' }),
      buildMessage({ created_at: '2026-07-12T10:00:00Z' }),
    ];
    const groups = groupMessagesByDate(msgs);
    expect(groups).toHaveLength(2);
  });
});
