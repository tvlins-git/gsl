/** Shared helpers for calendar invite edge function. */

export type Invitee = {
  email: string;
  name: string;
};

export function filterYesMaybeWithEmail(
  rows: { response: string; contact_email: string | null; display_name: string }[]
): Invitee[] {
  const invitees: Invitee[] = [];
  for (const row of rows) {
    if (row.response !== 'yes' && row.response !== 'maybe') continue;
    const email = row.contact_email?.trim();
    if (!email) continue;
    invitees.push({ email, name: row.display_name });
  }
  return invitees;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

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
  startsAt: string;
  endsAt: string;
  invitees: Invitee[];
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

  if (input.organizerEmail) {
    const name = escapeIcsText(input.organizerName ?? 'GSL');
    lines.push(`ORGANIZER;CN=${name}:mailto:${input.organizerEmail}`);
  }

  for (const invitee of input.invitees) {
    lines.push(
      `ATTENDEE;CN=${escapeIcsText(invitee.name)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${invitee.email}`
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export async function sendViaResend(input: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  ics: string;
  filename: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const icsBase64 = btoa(input.ics);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: [
        {
          filename: input.filename,
          content: icsBase64,
          content_type: 'text/calendar; method=REQUEST',
        },
      ],
    }),
  });

  return { ok: res.ok, status: res.status, body: await res.text() };
}
