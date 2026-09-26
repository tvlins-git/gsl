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

/** Add login accounts that are not yet group members, so they can be @mentioned. */
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
