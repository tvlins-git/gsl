import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildIcsInvite, filterYesMaybeWithEmail, sendViaResend } from './invite.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { poll_id, slot_id } = await req.json();
  if (!poll_id || !slot_id) {
    return new Response(JSON.stringify({ error: 'poll_id and slot_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: poll } = await supabase.from('polls').select('*').eq('id', poll_id).single();
  const { data: slot } = await supabase.from('poll_slots').select('*').eq('id', slot_id).single();
  if (!poll || !slot) {
    return new Response(JSON.stringify({ error: 'Poll or slot not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: responses } = await supabase
    .from('poll_responses')
    .select('response, member_id, members(display_name, contact_email)')
    .eq('slot_id', slot_id);

  const rows = (responses ?? []).map((r: {
    response: string;
    members: { display_name: string; contact_email: string | null } | null;
  }) => ({
    response: r.response,
    display_name: r.members?.display_name ?? 'Member',
    contact_email: r.members?.contact_email ?? null,
  }));

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
    const result = await sendViaResend({
      apiKey: resendKey,
      from,
      to: invitees.map((i) => i.email),
      subject: `Calendar invite: ${poll.title}`,
      text: `You're invited to ${poll.title}. Open the attached calendar invite to add it.`,
      ics,
      filename: 'gsl-invite.ics',
    });
    emailed = result.ok;
  }

  return new Response(
    JSON.stringify({
      invitee_count: invitees.length,
      invitees,
      emailed,
      ics,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
