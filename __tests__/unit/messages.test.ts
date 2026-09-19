import {
  createOptimisticMessage,
  groupMessagesByDate,
  isOptimisticMessageId,
  listThreadMessages,
  mergeMessages,
  sendThreadMessage,
  sortMessagesChronologically,
} from '@/lib/messages';
import { supabase } from '@/lib/supabase';
import { buildMessage } from '../factories';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
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

describe('listThreadMessages', () => {
  it('returns messages for a thread from supabase', async () => {
    const rows = [buildMessage({ id: 'm1' })];
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: rows, error: null }));
    await expect(listThreadMessages('thread-1')).resolves.toEqual(rows);
  });
});
