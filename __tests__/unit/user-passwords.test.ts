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
  isLocalMode: jest.fn(() => true),
}));

import { HARDCODED_USERS } from '@/constants/hardcoded-user';
import {
  getEffectivePassword,
  resetUserPassword,
  validateUserPassword,
} from '@/lib/user-passwords';

describe('user-passwords', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  });

  it('validates default passwords', async () => {
    const user = HARDCODED_USERS[0];
    await expect(validateUserPassword(user, 'thomas')).resolves.toBe(true);
    await expect(validateUserPassword(user, 'wrong')).resolves.toBe(false);
  });

  it('resets password and validates against the new one', async () => {
    const user = HARDCODED_USERS[1];
    const result = await resetUserPassword(user, 'jesper', 'newpass', 'newpass');
    expect(result).toEqual({ ok: true });
    await expect(validateUserPassword(user, 'newpass')).resolves.toBe(true);
    await expect(validateUserPassword(user, 'jesper')).resolves.toBe(false);
    await expect(getEffectivePassword(user)).resolves.toBe('newpass');
  });

  it('rejects reset when current password is wrong', async () => {
    const user = HARDCODED_USERS[0];
    const result = await resetUserPassword(user, 'bad', 'newpass', 'newpass');
    expect(result).toEqual({ ok: false, error: 'Current password is incorrect.' });
  });

  it('rejects reset when confirmation does not match', async () => {
    const user = HARDCODED_USERS[0];
    const result = await resetUserPassword(user, 'thomas', 'newpass', 'other');
    expect(result).toEqual({ ok: false, error: 'New passwords do not match.' });
  });
});
