import {
  buildIcsInvite,
  filterYesMaybeWithEmail,
  parseBearerToken,
  toIcsUtc,
} from './invite.ts';

Deno.test('parseBearerToken accepts only a bearer credential', () => {
  assertEquals(parseBearerToken('Bearer signed.jwt.token'), 'signed.jwt.token');
  assertEquals(parseBearerToken('bearer signed.jwt.token'), 'signed.jwt.token');
  assertEquals(parseBearerToken(null), null);
  assertEquals(parseBearerToken('signed.jwt.token'), null);
  assertEquals(parseBearerToken('Bearer '), null);
});

Deno.test('filterYesMaybeWithEmail keeps yes/maybe with email', () => {
  const invitees = filterYesMaybeWithEmail([
    { response: 'yes', contact_email: 'a@example.com', display_name: 'A' },
    { response: 'maybe', contact_email: 'b@example.com', display_name: 'B' },
    { response: 'no', contact_email: 'c@example.com', display_name: 'C' },
    { response: 'yes', contact_email: null, display_name: 'D' },
    { response: 'maybe', contact_email: '  ', display_name: 'E' },
  ]);
  assertEquals(invitees.map((i) => i.email), ['a@example.com', 'b@example.com']);
});

Deno.test('buildIcsInvite includes METHOD REQUEST and attendees', () => {
  const ics = buildIcsInvite({
    uid: 'poll-slot@gsl',
    title: 'September dinner',
    startsAt: '2026-09-19T15:00:00.000Z',
    endsAt: '2026-09-19T17:00:00.000Z',
    invitees: [{ email: 'a@example.com', name: 'Alice' }],
    organizerEmail: 'host@example.com',
    organizerName: 'Host',
  });
  assertEquals(ics.includes('METHOD:REQUEST'), true);
  assertEquals(ics.includes('SUMMARY:September dinner'), true);
  assertEquals(ics.includes('mailto:a@example.com'), true);
  assertEquals(ics.includes(`DTSTART:${toIcsUtc('2026-09-19T15:00:00.000Z')}`), true);
});

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected) && actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
