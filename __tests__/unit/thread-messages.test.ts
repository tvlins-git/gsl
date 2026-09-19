import { listThreadMessages, sendThreadMessage } from '@/lib/thread-messages';
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

describe('listThreadMessages', () => {
  it('returns messages for a thread from supabase', async () => {
    const rows = [buildMessage({ id: 'm1' })];
    (supabase.from as jest.Mock).mockReturnValue(mockQuery({ data: rows, error: null }));
    await expect(listThreadMessages('thread-1')).resolves.toEqual(rows);
  });
});
