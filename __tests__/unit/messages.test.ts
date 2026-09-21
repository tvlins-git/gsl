import {
  createOptimisticMessage,
  groupMessagesByDate,
  isOptimisticMessageId,
  mergeMessages,
  sortMessagesChronologically,
} from '@/lib/messages';
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

describe('mergeMessages', () => {
  it('appends a new message and keeps chronological order', () => {
    const older = buildMessage({ id: 'old', created_at: '2026-07-13T10:00:00Z' });
    const newer = buildMessage({ id: 'new', created_at: '2026-07-13T12:00:00Z' });
    expect(mergeMessages([older], [newer]).map((m) => m.id)).toEqual(['old', 'new']);
  });

  it('does not duplicate a message that is already in the list', () => {
    const msg = buildMessage({ id: 'same', body: 'Hi' });
    expect(mergeMessages([msg], [msg])).toHaveLength(1);
  });

  it('replaces an optimistic twin when the persisted message arrives', () => {
    const optimistic = createOptimisticMessage('thread-1', 'user-1', 'On my way');
    const saved = buildMessage({
      id: 'persisted',
      thread_id: 'thread-1',
      sender_id: 'user-1',
      body: 'On my way',
    });
    const merged = mergeMessages([optimistic], [saved]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('persisted');
    expect(isOptimisticMessageId(optimistic.id)).toBe(true);
  });
});
