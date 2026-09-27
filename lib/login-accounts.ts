import {
  ADMIN_USER_ID,
  type AppUser,
  type AppUserRole,
} from '@/constants/hardcoded-user';
import { listAppUsers } from './app-users';
import { isLocalMode } from './local-store';
import { isSupabaseConfigured, supabase } from './supabase';

/** Row returned by the public `list-login-accounts` Edge Function. */
export type LoginAccountRow = {
  member_id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: AppUserRole;
};

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug || 'user';
}

/**
 * Build an AppUser from a public login-account row (no local password yet).
 * Emails come from Auth via the Edge Function so cold-start sign-in works.
 */
export function appUserFromLoginAccount(row: LoginAccountRow): AppUser {
  const displayName = row.display_name.trim() || 'Member';
  const email = (row.email || '').trim().toLowerCase();
  const isSeedAdmin =
    displayName.toLowerCase() === 'hr. lins' || email === 'hr.lins@gsl.local';
  const id = isSeedAdmin ? ADMIN_USER_ID : slugify(displayName);
  return {
    id,
    email: email || (isSeedAdmin ? 'hr.lins@gsl.local' : `${id}@gsl.local`),
    password: '',
    displayName,
    role: row.role === 'admin' ? 'admin' : 'member',
    localMemberId: row.member_id,
    localUserId: row.user_id,
  };
}

/**
 * Merge a live login-account row with the matching local roster entry
 * (same display name) so device passwords / overrides keep working.
 */
export function mergeLoginAccountWithLocal(
  row: LoginAccountRow,
  localUsers: AppUser[]
): AppUser {
  const remote = appUserFromLoginAccount(row);
  const name = remote.displayName.trim().toLowerCase();
  const local = localUsers.find(
    (user) => user.displayName.trim().toLowerCase() === name
  );
  if (!local) return remote;
  return {
    ...local,
    email: remote.email || local.email,
    role: remote.role === 'admin' ? 'admin' : local.role,
    displayName: remote.displayName || local.displayName,
    localMemberId: remote.localMemberId || local.localMemberId,
    localUserId: remote.localUserId || local.localUserId,
  };
}

/**
 * Fetch live GSL login accounts via Edge Function `list-login-accounts`.
 * Uses the anon key only (no session) — safe for the logged-out picker.
 * Returns null when unavailable so callers can fall back to local roster.
 */
export async function fetchLoginAccounts(): Promise<LoginAccountRow[] | null> {
  if (!isSupabaseConfigured() || isLocalMode()) return null;

  const { data, error } = await supabase.functions.invoke('list-login-accounts', {
    body: {},
  });
  if (error) return null;
  if (!data || typeof data !== 'object') return null;
  if ('error' in data && typeof (data as { error: unknown }).error === 'string') {
    return null;
  }

  const accounts = (data as { accounts?: unknown }).accounts;
  if (!Array.isArray(accounts)) return null;

  const rows: LoginAccountRow[] = [];
  for (const raw of accounts) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const displayName = String(row.display_name ?? '').trim();
    const email = String(row.email ?? '').trim().toLowerCase();
    const memberId = String(row.member_id ?? '').trim();
    const userId = String(row.user_id ?? '').trim();
    if (!displayName || !memberId || !userId) continue;
    rows.push({
      member_id: memberId,
      user_id: userId,
      display_name: displayName,
      email: email || `${slugify(displayName)}@gsl.local`,
      role: row.role === 'admin' ? 'admin' : 'member',
    });
  }
  return rows;
}

/**
 * Logged-out Select-user list: live `public.members` (+ Auth emails) via
 * `list-login-accounts`, merged with this device's local password roster.
 * Falls back to AsyncStorage-only when offline / local mode / misconfigured.
 */
export async function listLoginPickerUsers(): Promise<AppUser[]> {
  const localUsers = await listAppUsers();
  const remote = await fetchLoginAccounts();
  if (!remote?.length) return localUsers;
  return remote.map((row) => mergeLoginAccountWithLocal(row, localUsers));
}
