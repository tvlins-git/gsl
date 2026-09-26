import { deletePoll, partitionPolls } from '@/lib/poll-list';
import { isLocalMode, localStore } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import { buildPoll } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {
    deletePoll: jest.fn(),
  },
}));

describe('partitionPolls', () => {
  it('splits open and locked polls', () => {
    const open = buildPoll({ id: 'open-1', status: 'open' });
    const locked = buildPoll({ id: 'locked-1', status: 'closed' });
    expect(partitionPolls([open, locked])).toEqual({
      open: [open],
      locked: [locked],
    });
  });

  it('returns empty groups when there are no polls', () => {
    expect(partitionPolls([])).toEqual({ open: [], locked: [] });
  });
});

describe('deletePoll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(true);
  });

  it('removes the poll through local storage', async () => {
    await deletePoll('poll-1');
    expect(localStore.deletePoll).toHaveBeenCalledWith('poll-1');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deletes the linked chat thread before the poll', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    const threadEq = jest.fn().mockResolvedValue({ error: null });
    const pollEq = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'threads') return { delete: () => ({ eq: threadEq }) };
      if (table === 'polls') return { delete: () => ({ eq: pollEq }) };
      throw new Error(`unexpected table ${table}`);
    });

    await deletePoll('poll-1');

    expect(threadEq).toHaveBeenCalledWith('poll_id', 'poll-1');
    expect(pollEq).toHaveBeenCalledWith('id', 'poll-1');
    expect(threadEq.mock.invocationCallOrder[0]).toBeLessThan(pollEq.mock.invocationCallOrder[0]);
  });

  it('leaves the poll in place when the thread delete fails', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(false);
    const threadEq = jest.fn().mockResolvedValue({ error: { message: 'nope' } });
    const pollEq = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'threads') return { delete: () => ({ eq: threadEq }) };
      if (table === 'polls') return { delete: () => ({ eq: pollEq }) };
      throw new Error(`unexpected table ${table}`);
    });

    await expect(deletePoll('poll-1')).rejects.toEqual({ message: 'nope' });
    expect(pollEq).not.toHaveBeenCalled();
  });
});
