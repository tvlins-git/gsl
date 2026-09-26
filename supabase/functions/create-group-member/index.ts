import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function alreadyRegistered(message: string | undefined) {
  const text = message?.toLowerCase() ?? '';
  return text.includes('already') && (text.includes('registered') || text.includes('exists'));
}

/** Keep in sync with lib/auth-password.ts — GoTrue rejects passwords shorter than 6. */
function passwordForAuth(password: string) {
  if (password.length >= 6) return password;
  return `${password}gslgsl`.slice(0, 6);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not signed in.' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'Server is missing Supabase credentials.' }, 500);
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser();
  if (callerAuthError || !callerAuth.user) return json({ error: 'Not signed in.' }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerMember, error: callerMemberError } = await admin
    .from('members')
    .select('group_id, role')
    .eq('user_id', callerAuth.user.id)
    .maybeSingle();
  if (callerMemberError || !callerMember || callerMember.role !== 'admin') {
    return json({ error: 'Only an admin can add members.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const displayName = String(body.display_name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!displayName || !email || password.length < 4) {
    return json({ error: 'Name, email, and a password are required.' }, 400);
  }

  let userId: string | null = null;
  const created = await admin.auth.admin.createUser({
    email,
    password: passwordForAuth(password),
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (created.data.user) {
    userId = created.data.user.id;
  } else if (alreadyRegistered(created.error?.message)) {
    userId = await findUserIdByEmail(admin, email);
  } else {
    return json({ error: created.error?.message ?? 'Could not create the login.' }, 400);
  }
  if (!userId) return json({ error: 'Could not find that login.' }, 400);

  const { data: existing } = await admin
    .from('members')
    .select('id, role')
    .eq('group_id', callerMember.group_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) {
    if (existing.role !== 'admin') {
      await admin.from('members').update({ display_name: displayName }).eq('id', existing.id);
    }
    return json({ user_id: userId });
  }

  const { error: insertError } = await admin.from('members').insert({
    group_id: callerMember.group_id,
    user_id: userId,
    display_name: displayName,
    role: 'member',
  });
  if (insertError) return json({ error: insertError.message }, 400);

  return json({ user_id: userId });
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
