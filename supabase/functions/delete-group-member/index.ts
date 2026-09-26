import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, preflight } from './http.ts';

/**
 * Admin-only: remove a group member row and the matching Auth user.
 * Service role stays on the server — clients only send the user JWT + email/name.
 */
serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(req, { error: 'Not signed in.' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json(req, { error: 'Server is missing Supabase credentials.' }, 500);
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
  if (callerAuthError || !callerAuth.user) return json(req, { error: 'Not signed in.' }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerMember, error: callerMemberError } = await admin
    .from('members')
    .select('group_id, role')
    .eq('user_id', callerAuth.user.id)
    .maybeSingle();
  if (callerMemberError || !callerMember || callerMember.role !== 'admin') {
    return json(req, { error: 'Only an admin can remove members.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const displayName = String(body.display_name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!displayName && !email) {
    return json(req, { error: 'Email or display name is required.' }, 400);
  }

  let userId: string | null = email ? await findUserIdByEmail(admin, email) : null;

  let memberRow: { id: string; user_id: string; role: string; display_name: string } | null = null;
  if (userId) {
    const { data } = await admin
      .from('members')
      .select('id, user_id, role, display_name')
      .eq('group_id', callerMember.group_id)
      .eq('user_id', userId)
      .maybeSingle();
    memberRow = data;
  }
  if (!memberRow && displayName) {
    const { data } = await admin
      .from('members')
      .select('id, user_id, role, display_name')
      .eq('group_id', callerMember.group_id)
      .ilike('display_name', displayName)
      .maybeSingle();
    memberRow = data;
    if (memberRow) userId = memberRow.user_id;
  }

  if (!memberRow && !userId) {
    // Already gone remotely — treat as success so Profile local delete still completes.
    return json(req, { removed: false, already_gone: true });
  }

  if (memberRow?.role === 'admin') {
    return json(req, { error: 'Admin users cannot be deleted.' }, 400);
  }
  if (userId && userId === callerAuth.user.id) {
    return json(req, { error: 'You cannot delete your own account.' }, 400);
  }

  if (memberRow) {
    const { error: deleteMemberError } = await admin.from('members').delete().eq('id', memberRow.id);
    if (deleteMemberError) {
      return json(req, { error: deleteMemberError.message }, 400);
    }
  }

  if (userId) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      // Member row is already gone (mentions/Hosts fixed). Surface auth leftover.
      return json(req, {
        removed: true,
        user_id: userId,
        auth_deleted: false,
        warning: deleteAuthError.message,
      });
    }
  }

  return json(req, { removed: true, user_id: userId, auth_deleted: Boolean(userId) });
});

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
