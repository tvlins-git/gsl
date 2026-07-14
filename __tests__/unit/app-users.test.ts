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

import { ADMIN_USER_ID, HARDCODED_USERS } from '@/constants/hardcoded-user';
import {
  __resetAppUsersCacheForTests,
  createAppUser,
  deleteAppUser,
  ensureAppUsersLoaded,
  listAppUsers,
} from '@/lib/app-users';

describe('app-users', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    __resetAppUsersCacheForTests();
  });

  it('seeds only Hr. Lins as the default admin', async () => {
    await ensureAppUsersLoaded();
    const users = await listAppUsers();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(ADMIN_USER_ID);
    expect(users[0].role).toBe('admin');
    expect(users[0].displayName).toBe('Hr. Lins');
  });

  it('strips legacy Hr. Andersen from stored users', async () => {
    storage['gsl_app_users_v1'] = JSON.stringify([
      {
        id: ADMIN_USER_ID,
        email: 'hr.lins@gsl.local',
        password: 'thomas',
        displayName: 'Hr. Lins',
        role: 'admin',
        localMemberId: '00000000-0000-4000-8000-000000000002',
        localUserId: '00000000-0000-4000-8000-000000000003',
      },
      {
        id: 'hr-andersen',
        email: 'hr.andersen@gsl.local',
        password: 'jesper',
        displayName: 'Hr. Andersen',
        role: 'member',
        localMemberId: '00000000-0000-4000-8000-000000000004',
        localUserId: '00000000-0000-4000-8000-000000000005',
      },
    ]);

    await ensureAppUsersLoaded();
    const users = await listAppUsers();
    expect(users.map((user) => user.id)).toEqual([ADMIN_USER_ID]);
  });

  it('creates a new member user', async () => {
    await ensureAppUsersLoaded();
    const result = await createAppUser({ displayName: 'Fru Hansen', password: 'secret' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.role).toBe('member');
    expect(result.user.email).toContain('@gsl.local');
    const users = await listAppUsers();
    expect(users.some((user) => user.displayName === 'Fru Hansen')).toBe(true);
  });

  it('prevents deleting the main admin', async () => {
    await ensureAppUsersLoaded();
    const result = await deleteAppUser(ADMIN_USER_ID, ADMIN_USER_ID);
    expect(result).toEqual({ ok: false, error: 'The main admin cannot be deleted.' });
  });

  it('deletes a non-admin user', async () => {
    await ensureAppUsersLoaded();
    const created = await createAppUser({ displayName: 'Temp User', password: 'temp1' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result = await deleteAppUser(created.user.id, ADMIN_USER_ID);
    expect(result).toEqual({ ok: true });
    const users = await listAppUsers();
    expect(users.some((user) => user.id === created.user.id)).toBe(false);
  });

  it('rejects create with short password', async () => {
    await ensureAppUsersLoaded();
    const result = await createAppUser({ displayName: 'Short', password: 'ab' });
    expect(result).toEqual({ ok: false, error: 'Password must be at least 4 characters.' });
  });

  it('keeps admin seed password available', () => {
    expect(HARDCODED_USERS).toHaveLength(1);
    expect(HARDCODED_USERS[0].password).toBe('thomas');
  });

  it('cannot delete own account', async () => {
    await ensureAppUsersLoaded();
    const created = await createAppUser({ displayName: 'Self', password: 'self1' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result = await deleteAppUser(created.user.id, created.user.id);
    expect(result).toEqual({ ok: false, error: 'You cannot delete your own account.' });
  });
});
