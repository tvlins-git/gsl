import { partitionPolls } from '@/lib/poll-list';
import { buildPoll } from '../factories';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
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
