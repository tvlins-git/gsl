import { Linking, Platform } from 'react-native';
import type { Member } from './database.types';
import type { PollResponseValue } from './polls';
import { formatSlotTime } from './polls';

export type InviteResponse = { slotId: string; memberId: string; response: PollResponseValue };

export type CalendarInvitee = {
  memberId: string;
  displayName: string;
  email: string;
  response: 'yes' | 'maybe';
};

export function isValidContactEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  // Practical validation for invite delivery; not full RFC compliance.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Members who answered yes/maybe for the slot and have a contact email. */
export function getCalendarInvitees(
  members: Member[],
  responses: InviteResponse[],
  slotId: string
): { invitees: CalendarInvitee[]; skippedWithoutEmail: number; skippedDeclined: number } {
  const byMember = new Map(members.map((m) => [m.id, m]));
  const slotResponses = responses.filter((r) => r.slotId === slotId);

  let skippedWithoutEmail = 0;
  let skippedDeclined = 0;
  const invitees: CalendarInvitee[] = [];

  for (const r of slotResponses) {
    if (r.response === 'no') {
      skippedDeclined += 1;
      continue;
    }
    if (r.response !== 'yes' && r.response !== 'maybe') continue;

    const member = byMember.get(r.memberId);
    if (!member) continue;

    const email = member.contact_email?.trim() ?? '';
    if (!email || !isValidContactEmail(email)) {
      skippedWithoutEmail += 1;
      continue;
    }

    invitees.push({
      memberId: member.id,
      displayName: member.display_name,
      email,
      response: r.response,
    });
  }

  return { invitees, skippedWithoutEmail, skippedDeclined };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Format a Date as UTC ICS timestamp: YYYYMMDDTHHMMSSZ */
export function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildIcsInvite(input: {
  uid: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  invitees: CalendarInvitee[];
  organizerEmail?: string;
  organizerName?: string;
}): string {
  const now = toIcsUtc(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GSL//Calendar Invite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(input.startsAt)}`,
    `DTEND:${toIcsUtc(input.endsAt)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  }

  const organizerEmail = input.organizerEmail?.trim();
  if (organizerEmail) {
    const name = escapeIcsText(input.organizerName ?? 'GSL');
    lines.push(`ORGANIZER;CN=${name}:mailto:${organizerEmail}`);
  }

  for (const invitee of input.invitees) {
    const cn = escapeIcsText(invitee.displayName);
    lines.push(
      `ATTENDEE;CN=${cn};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${invitee.email}`
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildGoogleCalendarUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  details?: string;
}): string {
  const dates = `${toIcsUtc(input.startsAt)}/${toIcsUtc(input.endsAt)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    details: input.details ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export type InviteDeliveryMethod = 'server' | 'share' | 'mailto' | 'none';

export function buildInviteMailto(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  invitees: CalendarInvitee[];
  googleCalendarUrl: string;
}): string {
  const when = formatSlotTime(input.startsAt, input.endsAt);
  const to = input.invitees.map((i) => i.email).join(',');
  const subject = `Calendar invite: ${input.title}`;
  const body = [
    `You're invited to ${input.title}.`,
    '',
    `When: ${when}`,
    '',
    'Add to your calendar:',
    input.googleCalendarUrl,
  ].join('\n');

  return `mailto:${encodeURIComponent(to).replace(/%2C/g, ',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function describeInviteResult(input: {
  inviteeCount: number;
  skippedWithoutEmail: number;
  delivery?: InviteDeliveryMethod;
}): string {
  const skippedSuffix =
    input.skippedWithoutEmail > 0
      ? ` Skipped ${input.skippedWithoutEmail} without a registered email.`
      : '';

  if (input.inviteeCount === 0 && input.skippedWithoutEmail === 0) {
    return 'Date locked. No one marked yes or maybe for this slot.';
  }
  if (input.inviteeCount === 0) {
    return `Date locked. ${input.skippedWithoutEmail} person(s) said yes/maybe but have no email in Settings.`;
  }

  switch (input.delivery) {
    case 'server':
      return `Date locked. Calendar invites emailed to ${input.inviteeCount} person(s).${skippedSuffix}`;
    case 'share':
      return `Date locked. Send the calendar invite to ${input.inviteeCount} person(s) from the share sheet.${skippedSuffix}`;
    case 'mailto':
      return `Date locked. Your mail app opened — send the message to deliver the invite.${skippedSuffix}`;
    default:
      return `Date locked.${skippedSuffix}`;
  }
}

function buildInviteShareText(input: { title: string; startsAt: string; endsAt: string }): string {
  const when = formatSlotTime(input.startsAt, input.endsAt);
  return `You're invited to ${input.title}.\n\nWhen: ${when}`;
}

/** Share the ICS file via the system share sheet (attaches invite on supported platforms). */
async function shareIcsInvite(input: {
  ics: string;
  filename: string;
  title: string;
  startsAt: string;
  endsAt: string;
}): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const file = new File([input.ics], input.filename, { type: 'text/calendar' });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      files: [file],
      title: `Calendar invite: ${input.title}`,
      text: buildInviteShareText(input),
    });
    return true;
  } catch {
    return false;
  }
}

/** Open a pre-filled mail compose window (no ICS download). */
async function openInviteMailto(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  invitees: CalendarInvitee[];
}): Promise<boolean> {
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    details: 'GSL group event',
  });

  const mailto = buildInviteMailto({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    invitees: input.invitees,
    googleCalendarUrl,
  });

  try {
    await Linking.openURL(mailto);
    return true;
  } catch {
    return false;
  }
}

/** Client-side fallback when server email is unavailable. */
export async function deliverCalendarInvite(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  invitees: CalendarInvitee[];
  ics: string;
  filename?: string;
}): Promise<InviteDeliveryMethod> {
  if (input.invitees.length === 0) return 'none';

  const filename = input.filename ?? 'gsl-invite.ics';

  const shared = await shareIcsInvite({
    ics: input.ics,
    filename,
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });
  if (shared) return 'share';

  const mailed = await openInviteMailto({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    invitees: input.invitees,
  });
  return mailed ? 'mailto' : 'none';
}

/** Lock flow helper: email via Supabase edge function when configured, else client fallback. */
export async function sendCalendarInvites(input: {
  pollId: string;
  slotId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  invitees: CalendarInvitee[];
  organizerEmail?: string;
  organizerName?: string;
  invokeServer?: (body: { poll_id: string; slot_id: string }) => Promise<{ emailed?: boolean } | null>;
}): Promise<InviteDeliveryMethod> {
  if (input.invitees.length === 0) return 'none';

  if (input.invokeServer) {
    try {
      const result = await input.invokeServer({
        poll_id: input.pollId,
        slot_id: input.slotId,
      });
      if (result?.emailed) return 'server';
    } catch {
      // Fall through to client delivery.
    }
  }

  const ics = buildIcsInvite({
    uid: `${input.pollId}-${input.slotId}@gsl`,
    title: input.title,
    description: 'GSL group event',
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    invitees: input.invitees,
    organizerEmail: input.organizerEmail,
    organizerName: input.organizerName,
  });

  return deliverCalendarInvite({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    invitees: input.invitees,
    ics,
    filename: `gsl-${input.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`,
  });
}
