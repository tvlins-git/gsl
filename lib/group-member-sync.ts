import { listAppUsers } from './app-users';
import { passwordForAuth } from './auth-password';
import { isLocalMode } from './local-store';
import { isSupabaseConfigured, supabase } from './supabase';
import { getEffectivePassword } from './user-passwords';

async function invokeErrorMessage(error: { message: string; context?: { json?: () => Promise<unknown> } }) {
  const body = await error.context?.json?.().catch(() => null);
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return error.message;
}

/**
 * Push local login accounts into remote `members` so they can be @mentioned.
 *
 * Call only from explicit Profile create (or equivalent admin actions).
 * Do NOT call from Feed / Hosts / Chat member loads — that silently resurrected
 * people who were deleted in Supabase while still present in AsyncStorage
 * (`gsl_app_users_v1`). After Profile delete removes the local roster entry,
 * this sync must not bring that display name / email back.
 */
export async function syncLoginAccountsIntoGroup(groupId: string): Promise<string[]> {
  if (isLocalMode() || !isSupabaseConfigured()) return [];

  const users = await listAppUsers();
  const { data, error } = await supabase
    .from('members')
    .select('display_name')
    .eq('group_id', groupId);
  if (error) return [error.message];

  const names = new Set(
    (data ?? []).map((row) => row.display_name.trim().toLowerCase()).filter(Boolean)
  );
  const failures: string[] = [];

  for (const user of users) {
    const name = user.displayName.trim().toLowerCase();
    if (!name || names.has(name)) continue;
    const password = passwordForAuth(await getEffectivePassword(user));
    const { error: invokeError } = await supabase.functions.invoke('create-group-member', {
      body: {
        email: user.email,
        password,
        display_name: user.displayName,
      },
    });
    if (invokeError) {
      failures.push(`${user.displayName}: ${await invokeErrorMessage(invokeError)}`);
      continue;
    }
    names.add(name);
  }

  return failures;
}

/**
 * Remove a login from remote members + Auth (admin Edge Function).
 * No-op in local mode. Idempotent when the remote user is already gone.
 */
export async function deleteLoginAccountFromGroup(input: {
  email: string;
  displayName: string;
}): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  if (isLocalMode() || !isSupabaseConfigured()) return { ok: true };

  const { data, error: invokeError } = await supabase.functions.invoke('delete-group-member', {
    body: {
      email: input.email,
      display_name: input.displayName,
    },
  });

  if (invokeError) {
    return { ok: false, error: await invokeErrorMessage(invokeError) };
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return { ok: false, error: data.error };
  }

  const warning =
    data && typeof data === 'object' && 'warning' in data && typeof data.warning === 'string'
      ? data.warning
      : undefined;
  return warning ? { ok: true, warning } : { ok: true };
}
