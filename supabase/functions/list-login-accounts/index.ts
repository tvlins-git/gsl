import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, preflight } from './http.ts';

/**
 * Public login picker for the GSL group.
 *
 * Called while logged out (anon key only — verify_jwt is off). Returns the
 * display names + Auth emails for public.members so a fresh TestFlight install
 * can show Hr. Lins / Diana / Test without a local AsyncStorage roster.
 *
 * Does not return passwords or contact_email.
 */
serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return json(req, { error: 'Server is missing Supabase credentials.' }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: groups, error: groupsError } = await admin
    .from('groups')
    .select('id')
    .eq('name', 'GSL')
    .order('created_at', { ascending: true })
    .limit(1);
  if (groupsError) return json(req, { error: groupsError.message }, 500);

  let groupId = groups?.[0]?.id as string | undefined;
  if (!groupId) {
    const { data: anyGroup, error: anyError } = await admin
      .from('groups')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1);
    if (anyError) return json(req, { error: anyError.message }, 500);
    groupId = anyGroup?.[0]?.id as string | undefined;
  }
  if (!groupId) {
    return json(req, { accounts: [] });
  }

  const { data: members, error: membersError } = await admin
    .from('members')
    .select('id, user_id, display_name, role')
    .eq('group_id', groupId)
    .order('display_name');
  if (membersError) return json(req, { error: membersError.message }, 500);

  const emailByUserId = await loadAuthEmails(admin);

  const accounts = (members ?? []).map((member) => {
    const displayName = String(member.display_name ?? '').trim() || 'Member';
    const email =
      emailByUserId.get(member.user_id) ??
      fallbackEmailForDisplayName(displayName);
    return {
      member_id: member.id,
      user_id: member.user_id,
      display_name: displayName,
      email,
      role: member.role === 'admin' ? 'admin' : 'member',
    };
  });

  return json(req, { group_id: groupId, accounts });
});

function fallbackEmailForDisplayName(displayName: string): string {
  if (displayName.toLowerCase() === 'hr. lins') return 'hr.lins@gsl.local';
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug || 'user'}@gsl.local`;
}

async function loadAuthEmails(
  admin: ReturnType<typeof createClient>
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const user of data.users) {
      if (user.id && user.email) {
        emails.set(user.id, user.email.toLowerCase());
      }
    }
    if (data.users.length < 200) break;
  }
  return emails;
}
