import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildExpoPushPayload,
  filterRecipients,
  filterRecipientsByPreference,
  mergeRecipients,
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

  const tokenRows = (tokens ?? []).map((t: { user_id: string; expo_push_token: string }) => ({
    userId: t.user_id,
    token: t.expo_push_token,
  }));
  const excludeUserIds = Array.isArray(exclude_user_ids) ? exclude_user_ids : [];

  let targeted = filterRecipients(
    tokenRows,
    excludeUserIds,
    Array.isArray(user_ids) ? user_ids : null
  );

  // Chat @mentions often send only the tagged user_ids. Preference "all" still
  // means every chat message from others — merge those members in (server-side
  // so stale client rosters cannot omit them). Skip when tag_notification is
  // false so targeted nudges (poll unanswered) stay narrowly addressed.
  const isTagEvent = Boolean(tag_notification);
  if (type === 'chat' && isTagEvent && Array.isArray(user_ids)) {
    const allPrefUserIds = [...preferenceByUserId.entries()]
      .filter(([, preference]) => preference === 'all')
      .map(([userId]) => userId);
    targeted = mergeRecipients(
      targeted,
      filterRecipients(tokenRows, excludeUserIds, allPrefUserIds)
    );
  }

  const recipients = filterRecipientsByPreference(
    targeted,
    preferenceByUserId,
    isTagEvent
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
