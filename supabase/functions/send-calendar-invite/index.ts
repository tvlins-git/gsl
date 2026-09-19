import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildIcsInvite,
  filterYesMaybeWithEmail,
  parseBearerToken,
  sendViaResend,
} from './invite.ts';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  const token = parseBearerToken(authHeader);
  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader! } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let payload: { poll_id?: string; slot_id?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { poll_id, slot_id } = payload;
  if (!poll_id || !slot_id) {
    return jsonResponse({ error: 'poll_id and slot_id required' }, 400);
  }

  // This client carries the caller's JWT, so RLS only exposes polls in their group.
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', poll_id)
    .maybeSingle();
  if (pollError) {
    return jsonResponse({ error: 'Could not load poll' }, 500);
  }

  const { data: member, error: memberError } = poll
    ? await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', poll.group_id)
        .maybeSingle()
    : { data: null, error: null };
  if (memberError) {
    return jsonResponse({ error: 'Could not authorize caller' }, 500);
  }
  if (poll && !member) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { data: slot, error: slotError } = await supabase
    .from('poll_slots')
    .select('*')
    .eq('id', slot_id)
    .eq('poll_id', poll_id)
    .maybeSingle();
  if (slotError) {
    return jsonResponse({ error: 'Could not load slot' }, 500);
  }
  if (!poll || !slot) {
    return jsonResponse({ error: 'Poll or slot not found' }, 404);
  }

  const { data: responses, error: responsesError } = await supabase
    .from('poll_responses')
    .select('response, member_id, members(display_name, contact_email)')
    .eq('slot_id', slot_id);
  if (responsesError) {
    return jsonResponse({ error: 'Could not load invitees' }, 500);
  }

  const rows = (responses ?? []).map((response) => {
    const relatedMember = Array.isArray(response.members)
      ? response.members[0]
      : response.members;
    return {
      response: response.response,
      display_name: relatedMember?.display_name ?? 'Member',
      contact_email: relatedMember?.contact_email ?? null,
    };
  });

  const invitees = filterYesMaybeWithEmail(rows);
  const ics = buildIcsInvite({
    uid: `${poll.id}-${slot.id}@gsl`,
    title: poll.title,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    invitees,
  });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'GSL <onboarding@resend.dev>';

  let emailed = false;
  if (resendKey && invitees.length > 0) {
    const when = new Date(slot.starts_at).toLocaleString('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const result = await sendViaResend({
      apiKey: resendKey,
      from,
      to: invitees.map((i) => i.email),
      subject: `Invitation: ${poll.title}`,
      text: [
        `You're invited to ${poll.title}.`,
        '',
        `When: ${when}`,
        '',
        'Open the attached calendar invite (.ics) to add this event to your calendar.',
      ].join('\n'),
      ics,
      filename: 'invite.ics',
    });
    emailed = result.ok;
  }

  return jsonResponse({
    invitee_count: invitees.length,
    invitees,
    emailed,
    ics,
  });
});
