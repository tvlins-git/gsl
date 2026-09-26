const storage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(storage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
  },
}));

import { getGroupMembers } from '@/lib/auth';
import { syncLoginAccountsIntoGroup } from '@/lib/group-member-sync';
import { isLocalMode, localStore, getLocalGroupMembers } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/group-member-sync', () => ({
  syncLoginAccountsIntoGroup: jest.fn(async () => []),
  deleteLoginAccountFromGroup: jest.fn(async () => ({ ok: true })),
}));

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
  localStore: { hydrate: jest.fn(async () => undefined) },
  getLocalGroupMembers: jest.fn(() => []),
  enableLocalMode: jest.fn(),
  disableLocalMode: jest.fn(),
  setActiveLocalUser: jest.fn(),
  createLocalMember: jest.fn(),
}));

function membersListQuery(rows: { display_name: string }[]) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(async () => ({ data: rows, error: null })),
  };
  return query;
}

describe('getGroupMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(storage).forEach((key) => delete storage[key]);
    (isLocalMode as jest.Mock).mockReturnValue(false);
  });

  it('loads remote members without silently re-syncing deleted local accounts', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      membersListQuery([{ display_name: 'Hr. Lins' }])
    );

    const members = await getGroupMembers('group-1');

    expect(members).toEqual([{ display_name: 'Hr. Lins' }]);
    expect(syncLoginAccountsIntoGroup).not.toHaveBeenCalled();
  });

  it('uses the local roster in local mode', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    (getLocalGroupMembers as jest.Mock).mockReturnValue([{ display_name: 'Hr. Lins' }]);

    await expect(getGroupMembers('group-1')).resolves.toEqual([{ display_name: 'Hr. Lins' }]);
    expect(localStore.hydrate).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(syncLoginAccountsIntoGroup).not.toHaveBeenCalled();
  });
});
