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

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
}));

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { ADMIN_USER_ID } from '@/constants/hardcoded-user';
import {
  __resetAppUsersCacheForTests,
  ensureAppUsersLoaded,
  listAppUsers,
} from '@/lib/app-users';
import {
  appUserFromLoginAccount,
  listLoginPickerUsers,
  mergeLoginAccountWithLocal,
} from '@/lib/login-accounts';
import { isLocalMode } from '@/lib/local-store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

describe('login-accounts (cold-start login picker)', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    __resetAppUsersCacheForTests();
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
  });

  it('maps Auth emails from list-login-accounts into AppUser rows', () => {
    const diana = appUserFromLoginAccount({
      member_id: 'fccd8a71-431d-42ad-a78e-15e3de5997b1',
      user_id: 'baa2d7bf-bf2f-4d6b-8b28-dca82b795422',
      display_name: 'Diana',
      email: 'diana@gsl.local',
      role: 'member',
    });
    expect(diana).toMatchObject({
      id: 'diana',
      email: 'diana@gsl.local',
      displayName: 'Diana',
      password: '',
      role: 'member',
    });
  });

  it('keeps Hr. Lins admin id when merging local seed password', () => {
    const local = {
      id: ADMIN_USER_ID,
      email: 'hr.lins@gsl.local',
      password: 'thomas',
      displayName: 'Hr. Lins',
      role: 'admin' as const,
      localMemberId: 'local',
      localUserId: 'local-user',
    };
    const merged = mergeLoginAccountWithLocal(
      {
        member_id: 'a291b9a3-5429-40cd-a445-1f493378362c',
        user_id: 'd150240a-4126-458c-a060-059ef582d2db',
        display_name: 'Hr. Lins',
        email: 'hr.lins@gsl.local',
        role: 'admin',
      },
      [local]
    );
    expect(merged.id).toBe(ADMIN_USER_ID);
    expect(merged.password).toBe('thomas');
    expect(merged.localMemberId).toBe('a291b9a3-5429-40cd-a445-1f493378362c');
  });

  it('after fresh install (local = Hr. Lins only) shows Diana + Test from live members', async () => {
    await ensureAppUsersLoaded();
    const localOnly = await listAppUsers();
    expect(localOnly.map((user) => user.displayName)).toEqual(['Hr. Lins']);

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        group_id: '4a1ae983-b5da-40db-b832-6791ac0629aa',
        accounts: [
          {
            member_id: 'fccd8a71-431d-42ad-a78e-15e3de5997b1',
            user_id: 'baa2d7bf-bf2f-4d6b-8b28-dca82b795422',
            display_name: 'Diana',
            email: 'diana@gsl.local',
            role: 'member',
          },
          {
            member_id: 'a291b9a3-5429-40cd-a445-1f493378362c',
            user_id: 'd150240a-4126-458c-a060-059ef582d2db',
            display_name: 'Hr. Lins',
            email: 'hr.lins@gsl.local',
            role: 'admin',
          },
          {
            member_id: '0dc8a48e-29bf-4fd4-85d0-786802f1521f',
            user_id: '25b04bb9-a7e7-4b50-94f3-f7cd55bc73ac',
            display_name: 'Test',
            email: 'test@gsl.local',
            role: 'member',
          },
        ],
      },
      error: null,
    });

    const users = await listLoginPickerUsers();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('list-login-accounts', { body: {} });
    expect(users.map((user) => user.displayName)).toEqual(['Diana', 'Hr. Lins', 'Test']);
    expect(users.find((user) => user.displayName === 'Diana')?.email).toBe('diana@gsl.local');
    expect(users.find((user) => user.displayName === 'Test')?.email).toBe('test@gsl.local');
    // Local seed password for admin is preserved; remote-only accounts have none yet.
    expect(users.find((user) => user.displayName === 'Hr. Lins')?.password).toBe('thomas');
    expect(users.find((user) => user.displayName === 'Diana')?.password).toBe('');
  });

  it('falls back to local roster when the Edge Function is unreachable', async () => {
    await ensureAppUsersLoaded();
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function' },
    });

    const users = await listLoginPickerUsers();
    expect(users.map((user) => user.displayName)).toEqual(['Hr. Lins']);
  });
});
