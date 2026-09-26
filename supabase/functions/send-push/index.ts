import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildExpoPushPayload,
  filterRecipients,
  filterRecipientsByPreference,
  parseNotificationPreference,
  sendExpoPush,
  type NotificationPreference,
} from './push.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { type, group_id, exclude_user_ids, user_ids, tag_notification, title, body, data } =
    await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: members } = await supabase
    .from('members')
    .select('user_id, notification_preference')
    .eq('group_id', group_id);

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  const preferenceByUserId = new Map<string, NotificationPreference>();
  for (const member of members ?? []) {
    preferenceByUserId.set(
      member.user_id,
      parseNotificationPreference(member.notification_preference)
    );
  }

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('user_id, expo_push_token')
    .in('user_id', userIds);

  const targeted = filterRecipients(
    (tokens ?? []).map((t: { user_id: string; expo_push_token: string }) => ({
      userId: t.user_id,
      token: t.expo_push_token,
    })),
    exclude_user_ids ?? [],
    Array.isArray(user_ids) ? user_ids : null
  );

  const recipients = filterRecipientsByPreference(
    targeted,
    preferenceByUserId,
    Boolean(tag_notification)
  );

  const payload = buildExpoPushPayload(recipients, {
    title: title ?? 'GSL',
    body: body ?? 'New notification',
    data: { type, ...data },
  });

  const result = await sendExpoPush(payload);

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
