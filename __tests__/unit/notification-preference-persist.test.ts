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

import { updateMemberNotificationPreference, memberNotificationPreference } from '@/lib/auth';
import { isLocalMode, localStore } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
  localStore: {
    hydrate: jest.fn(async () => undefined),
    updateMemberNotificationPreference: jest.fn(),
  },
  enableLocalMode: jest.fn(),
  disableLocalMode: jest.fn(),
  setActiveLocalUser: jest.fn(),
  createLocalMember: jest.fn(),
  getLocalGroupMembers: jest.fn(() => []),
}));

function membersUpdateQuery(row: Record<string, unknown> | null, error: { message: string } | null = null) {
  const query: Record<string, jest.Mock> = {};
  query.update = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.select = jest.fn(() => query);
  query.single = jest.fn(async () => ({ data: row, error }));
  return query;
}

function membersSelectQuery(row: Record<string, unknown> | null, error: { message: string } | null = null) {
  const query: Record<string, jest.Mock> = {};
  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.single = jest.fn(async () => ({ data: row, error }));
  return query;
}

describe('updateMemberNotificationPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
  });

  it('writes notification_preference, re-reads, and returns the verified row', async () => {
    const saved = {
      id: 'member-1',
      notification_preference: 'off',
      display_name: 'Hr. Lins',
    };
    const updateQuery = membersUpdateQuery(saved);
    const selectQuery = membersSelectQuery(saved);
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(selectQuery);

    await expect(updateMemberNotificationPreference('member-1', 'off')).resolves.toEqual(saved);
    expect(supabase.from).toHaveBeenCalledWith('members');
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'member-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(selectQuery.eq).toHaveBeenCalledWith('id', 'member-1');
    expect(selectQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('throws when the re-read row does not reflect the saved preference', async () => {
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(
        membersUpdateQuery({ id: 'member-1', notification_preference: 'off' })
      )
      .mockReturnValueOnce(
        membersSelectQuery({ id: 'member-1', notification_preference: 'all' })
      );

    await expect(updateMemberNotificationPreference('member-1', 'off')).rejects.toThrow(
      /did not save/i
    );
  });

  it('throws when there is no session and local mode is off', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(updateMemberNotificationPreference('member-1', 'tagged')).rejects.toThrow(
      /not signed in/i
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('uses the local store only when there is no session in local mode', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (localStore.updateMemberNotificationPreference as jest.Mock).mockResolvedValue({
      id: 'local',
      notification_preference: 'tagged',
    });

    await expect(updateMemberNotificationPreference('local', 'tagged')).resolves.toMatchObject({
      notification_preference: 'tagged',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('writes to public.members when a session exists even if local mode is on', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    const saved = { id: 'member-1', notification_preference: 'tagged' };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(membersUpdateQuery(saved))
      .mockReturnValueOnce(membersSelectQuery(saved));

    await expect(updateMemberNotificationPreference('member-1', 'tagged')).resolves.toEqual(saved);
    expect(localStore.updateMemberNotificationPreference).not.toHaveBeenCalled();
  });
});

describe('memberNotificationPreference', () => {
  it('reads the column from a member row after login', () => {
    expect(
      memberNotificationPreference({
        id: 'm1',
        group_id: 'g1',
        user_id: 'u1',
        display_name: 'Hr. Lins',
        avatar_url: null,
        contact_email: null,
        notification_preference: 'off',
        role: 'admin',
        created_at: '2026-09-26T00:00:00Z',
      })
    ).toBe('off');
  });

  it('defaults to all when the member row is missing', () => {
    expect(memberNotificationPreference(null)).toBe('all');
  });
});
