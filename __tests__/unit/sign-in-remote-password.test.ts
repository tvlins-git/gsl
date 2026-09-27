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

import { signInWithPassword } from '@/lib/auth';
import { isLocalMode } from '@/lib/local-store';
import { supabase } from '@/lib/supabase';
import { getEffectivePassword, validateUserPassword } from '@/lib/user-passwords';

jest.mock('@/lib/user-passwords', () => ({
  getEffectivePassword: jest.fn(),
  validateUserPassword: jest.fn(),
}));

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
  disableLocalMode: jest.fn(),
  enableLocalMode: jest.fn(),
  getLocalGroupMembers: jest.fn(),
  localStore: { hydrate: jest.fn() },
  setActiveLocalUser: jest.fn(),
  createLocalMember: jest.fn(),
}));

describe('signInWithPassword', () => {
  const localUser = {
    id: 'hr-lins',
    email: 'hr.lins@gsl.local',
    password: 'thomas',
    displayName: 'Hr. Lins',
    role: 'admin' as const,
    localMemberId: 'm1',
    localUserId: 'u1',
  };

  const remoteOnly = {
    id: 'diana',
    email: 'diana@gsl.local',
    password: '',
    displayName: 'Diana',
    role: 'member' as const,
    localMemberId: 'm2',
    localUserId: 'u2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(false);
  });

  it('validates against the local password when one is stored', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('thomas');
    (validateUserPassword as jest.Mock).mockResolvedValue(true);

    await expect(signInWithPassword(localUser, 'thomas')).resolves.toEqual({ ok: true });
    expect(validateUserPassword).toHaveBeenCalledWith(localUser, 'thomas');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects a wrong local password without calling Auth', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('thomas');
    (validateUserPassword as jest.Mock).mockResolvedValue(false);

    await expect(signInWithPassword(localUser, 'wrong')).resolves.toEqual({
      ok: false,
      error: 'Incorrect password.',
    });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('verifies remote-only (empty local password) accounts against Supabase Auth', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('');
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    });

    await expect(signInWithPassword(remoteOnly, 'diana-secret')).resolves.toEqual({ ok: true });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'diana@gsl.local',
      password: 'diana-secret',
    });
  });

  it('rejects remote-only sign-in when Auth rejects the typed password', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('');
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(signInWithPassword(remoteOnly, 'wrong')).resolves.toEqual({
      ok: false,
      error: 'Incorrect password.',
    });
  });

  it('rejects blank password for remote-only accounts', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('');

    await expect(signInWithPassword(remoteOnly, '   ')).resolves.toEqual({
      ok: false,
      error: 'Incorrect password.',
    });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
