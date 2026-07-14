import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HardcodedUser } from '@/constants/hardcoded-user';
import { isLocalMode } from './local-store';
import { supabase } from './supabase';

const STORAGE_KEY = 'gsl_user_passwords_v1';

type PasswordOverrides = Partial<Record<HardcodedUser['id'], string>>;

async function readOverrides(): Promise<PasswordOverrides> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PasswordOverrides;
  } catch {
    return {};
  }
}

async function writeOverrides(overrides: PasswordOverrides) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export async function getEffectivePassword(user: HardcodedUser): Promise<string> {
  const overrides = await readOverrides();
  return overrides[user.id] ?? user.password;
}

export async function validateUserPassword(user: HardcodedUser, password: string): Promise<boolean> {
  const expected = await getEffectivePassword(user);
  return password === expected;
}

export async function resetUserPassword(
  user: HardcodedUser,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await validateUserPassword(user, currentPassword))) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  if (newPassword.length < 4) {
    return { ok: false, error: 'New password must be at least 4 characters.' };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'New passwords do not match.' };
  }

  const overrides = await readOverrides();
  overrides[user.id] = newPassword;
  await writeOverrides(overrides);

  if (!isLocalMode()) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}
