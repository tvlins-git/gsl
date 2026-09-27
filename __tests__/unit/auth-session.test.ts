import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearLoggedOut,
  getStoredUser,
  isLoggedOut,
  setLocalModePersisted,
  setStoredUser,
  signOutUser,
  wasLocalModePersisted,
} from '@/lib/auth';
import { HARDCODED_USERS } from '@/constants/hardcoded-user';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockUsers = HARDCODED_USERS;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: null } })),
      getUser: jest.fn(async () => ({ data: { user: null } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/lib/app-users', () => {
  const actual = jest.requireActual('@/lib/app-users');
  return {
    ...actual,
    ensureAppUsersLoaded: jest.fn(async () => undefined),
    getAppUser: jest.fn(async (id: string) =>
      mockUsers.find((user) => user.id === id) ?? null
    ),
  };
});

describe('auth session persistence helpers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('getStoredUser returns null when no login identity was chosen', async () => {
    expect(await getStoredUser()).toBeNull();
  });

  it('remembers the selected user across storage reads', async () => {
    const user = HARDCODED_USERS[0];
    await setStoredUser(user);
    expect(await getStoredUser()).toEqual(user);
  });

  it('tracks explicit logout separately from local-mode persistence', async () => {
    expect(await isLoggedOut()).toBe(false);
    expect(await wasLocalModePersisted()).toBe(false);

    await setLocalModePersisted(true);
    expect(await wasLocalModePersisted()).toBe(true);

    await signOutUser();
    expect(await isLoggedOut()).toBe(true);
    expect(await wasLocalModePersisted()).toBe(false);

    await clearLoggedOut();
    expect(await isLoggedOut()).toBe(false);
  });
});
