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

import { ADMIN_USER_ID } from '@/constants/hardcoded-user';
import {
  __resetAppUsersCacheForTests,
  createAppUser,
  ensureAppUsersLoaded,
  listAppUsers,
} from '@/lib/app-users';
import { getGroupMembers } from '@/lib/auth';
import {
  appUserFromRemoteMember,
  listManagedGroupUsers,
  mergeMemberWithLocalUsers,
} from '@/lib/group-managed-users';
import { listLoginPickerUsers } from '@/lib/login-accounts';
import { isLocalMode } from '@/lib/local-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Member } from '@/lib/database.types';

jest.mock('@/lib/auth', () => ({
  getGroupMembers: jest.fn(),
}));

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
}));

jest.mock('@/lib/login-accounts', () => ({
  listLoginPickerUsers: jest.fn(),
}));

function member(partial: Partial<Member> & Pick<Member, 'display_name' | 'role'>): Member {
  return {
    id: partial.id ?? `member-${partial.display_name}`,
    group_id: partial.group_id ?? 'group-1',
    user_id: partial.user_id ?? `user-${partial.display_name}`,
    display_name: partial.display_name,
    avatar_url: partial.avatar_url ?? null,
    role: partial.role,
    created_at: partial.created_at ?? '2026-09-26T00:00:00Z',
    contact_email: partial.contact_email ?? null,
    notification_preference: partial.notification_preference ?? 'all',
  };
}

describe('group-managed-users', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    __resetAppUsersCacheForTests();
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (listLoginPickerUsers as jest.Mock).mockImplementation(async () => listAppUsers());
  });

  it('maps a remote-only member like Diana into an AppUser with gsl.local email', () => {
    const diana = appUserFromRemoteMember(
      member({
        id: 'fccd8a71-431d-42ad-a78e-15e3de5997b1',
        user_id: 'baa2d7bf-bf2f-4d6b-8b28-dca82b795422',
        display_name: 'Diana',
        role: 'member',
      })
    );
    expect(diana).toMatchObject({
      id: 'diana',
      email: 'diana@gsl.local',
      displayName: 'Diana',
      role: 'member',
      localMemberId: 'fccd8a71-431d-42ad-a78e-15e3de5997b1',
      localUserId: 'baa2d7bf-bf2f-4d6b-8b28-dca82b795422',
    });
  });

  it('keeps the protected admin id for Hr. Lins', () => {
    const admin = appUserFromRemoteMember(
      member({ display_name: 'Hr. Lins', role: 'admin' })
    );
    expect(admin.id).toBe(ADMIN_USER_ID);
    expect(admin.email).toBe('hr.lins@gsl.local');
    expect(admin.role).toBe('admin');
  });

  it('prefers local login credentials when merging a remote member', () => {
    const local = {
      id: 'test',
      email: 'test@gsl.local',
      password: 'secret',
      displayName: 'Test',
      role: 'member' as const,
      localMemberId: 'local-member',
      localUserId: 'local-user',
    };
    const merged = mergeMemberWithLocalUsers(
      member({
        id: '0dc8a48e-29bf-4fd4-85d0-786802f1521f',
        user_id: '25b04bb9-a7e7-4b50-94f3-f7cd55bc73ac',
        display_name: 'Test',
        role: 'member',
      }),
      [local]
    );
    expect(merged.id).toBe('test');
    expect(merged.password).toBe('secret');
    expect(merged.localMemberId).toBe('0dc8a48e-29bf-4fd4-85d0-786802f1521f');
    expect(merged.localUserId).toBe('25b04bb9-a7e7-4b50-94f3-f7cd55bc73ac');
  });

  it('lists live public.members for the signed-in group, including remote-only Diana', async () => {
    await ensureAppUsersLoaded();
    await createAppUser({ displayName: 'Test', password: 'secret' });

    (getGroupMembers as jest.Mock).mockResolvedValue([
      member({ display_name: 'Diana', role: 'member' }),
      member({ display_name: 'Hr. Lins', role: 'admin' }),
      member({
        id: '0dc8a48e-29bf-4fd4-85d0-786802f1521f',
        user_id: '25b04bb9-a7e7-4b50-94f3-f7cd55bc73ac',
        display_name: 'Test',
        role: 'member',
      }),
    ]);

    const users = await listManagedGroupUsers('4a1ae983-b5da-40db-b832-6791ac0629aa');

    expect(getGroupMembers).toHaveBeenCalledWith('4a1ae983-b5da-40db-b832-6791ac0629aa');
    expect(listLoginPickerUsers).not.toHaveBeenCalled();
    expect(users.map((user) => user.displayName)).toEqual(['Diana', 'Hr. Lins', 'Test']);
    expect(users.find((user) => user.displayName === 'Diana')?.email).toBe('diana@gsl.local');
    expect(users.find((user) => user.displayName === 'Test')?.password).toBe('secret');
  });

  it('falls back to the local roster in local mode', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    await ensureAppUsersLoaded();
    await createAppUser({ displayName: 'Test', password: 'secret' });

    const users = await listManagedGroupUsers('group-1');

    expect(getGroupMembers).not.toHaveBeenCalled();
    expect(listLoginPickerUsers).not.toHaveBeenCalled();
    expect(users.map((user) => user.displayName)).toEqual(['Hr. Lins', 'Test']);
  });

  it('uses list-login-accounts picker when logged out (no group id)', async () => {
    await ensureAppUsersLoaded();
    (listLoginPickerUsers as jest.Mock).mockResolvedValue([
      {
        id: ADMIN_USER_ID,
        email: 'hr.lins@gsl.local',
        password: 'thomas',
        displayName: 'Hr. Lins',
        role: 'admin',
        localMemberId: 'a',
        localUserId: 'b',
      },
      {
        id: 'diana',
        email: 'diana@gsl.local',
        password: '',
        displayName: 'Diana',
        role: 'member',
        localMemberId: 'fccd8a71-431d-42ad-a78e-15e3de5997b1',
        localUserId: 'baa2d7bf-bf2f-4d6b-8b28-dca82b795422',
      },
    ]);

    const users = await listManagedGroupUsers(null);

    expect(getGroupMembers).not.toHaveBeenCalled();
    expect(listLoginPickerUsers).toHaveBeenCalled();
    expect(users.map((user) => user.displayName)).toEqual(['Hr. Lins', 'Diana']);
  });

  it('includes a just-created user in the logged-out login roster', async () => {
    await ensureAppUsersLoaded();
    const created = await createAppUser({ displayName: 'Post Create', password: 'secret' });
    expect(created.ok).toBe(true);

    // Default mock delegates to listAppUsers (local roster after create).
    const loginList = await listManagedGroupUsers(null);
    expect(loginList.map((user) => user.displayName)).toEqual(['Hr. Lins', 'Post Create']);
    expect(getGroupMembers).not.toHaveBeenCalled();
  });
});
