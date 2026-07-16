import {
  buildGoogleCalendarUrl,
  buildIcsInvite,
  describeInviteResult,
  getCalendarInvitees,
  isValidContactEmail,
  sendCalendarInvites,
  toIcsUtc,
} from '@/lib/calendar-invite';
import { buildMember } from '../factories';

describe('isValidContactEmail', () => {
  it('accepts normal emails', () => {
    expect(isValidContactEmail('you@example.com')).toBe(true);
  });

  it('rejects empty or malformed', () => {
    expect(isValidContactEmail('')).toBe(false);
    expect(isValidContactEmail('not-an-email')).toBe(false);
  });
});

describe('getCalendarInvitees', () => {
  const members = [
    buildMember({ id: 'm1', display_name: 'Hr. Lins', contact_email: 'lins@example.com' }),
    buildMember({ id: 'm2', display_name: 'Hr. Andersen', contact_email: 'andersen@example.com' }),
    buildMember({ id: 'm3', display_name: 'No Email', contact_email: null }),
  ];

  it('includes yes and maybe with registered email', () => {
    const { invitees, skippedWithoutEmail, skippedDeclined } = getCalendarInvitees(
      members,
      [
        { slotId: 's1', memberId: 'm1', response: 'yes' },
        { slotId: 's1', memberId: 'm2', response: 'maybe' },
        { slotId: 's1', memberId: 'm3', response: 'yes' },
        { slotId: 's1', memberId: 'other', response: 'no' },
      ],
      's1'
    );

    expect(invitees.map((i) => i.email).sort()).toEqual([
      'andersen@example.com',
      'lins@example.com',
    ]);
    expect(skippedWithoutEmail).toBe(1);
    expect(skippedDeclined).toBe(1);
  });

  it('only considers the locked slot', () => {
    const { invitees } = getCalendarInvitees(
      members,
      [
        { slotId: 's1', memberId: 'm1', response: 'yes' },
        { slotId: 's2', memberId: 'm2', response: 'yes' },
      ],
      's2'
    );
    expect(invitees).toHaveLength(1);
    expect(invitees[0].email).toBe('andersen@example.com');
  });
});

describe('buildIcsInvite', () => {
  it('builds a METHOD:REQUEST calendar invite', () => {
    const ics = buildIcsInvite({
      uid: 'abc@gsl',
      title: 'Dinner',
      startsAt: '2026-09-19T15:00:00.000Z',
      endsAt: '2026-09-19T17:00:00.000Z',
      invitees: [{ memberId: 'm1', displayName: 'Alice', email: 'a@example.com', response: 'yes' }],
      organizerEmail: 'host@example.com',
      organizerName: 'Host',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('SUMMARY:Dinner');
    expect(ics).toContain('mailto:a@example.com');
    expect(ics).toContain(`DTSTART:${toIcsUtc('2026-09-19T15:00:00.000Z')}`);
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('returns a Google Calendar template link', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Dinner',
      startsAt: '2026-09-19T15:00:00.000Z',
      endsAt: '2026-09-19T17:00:00.000Z',
    });
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('text=Dinner');
  });
});

describe('describeInviteResult', () => {
  it('summarizes server email delivery', () => {
    expect(
      describeInviteResult({ inviteeCount: 2, skippedWithoutEmail: 1, delivery: 'server' })
    ).toContain('emailed to 2');
  });

  it('summarizes missing emails', () => {
    expect(describeInviteResult({ inviteeCount: 0, skippedWithoutEmail: 2 })).toContain(
      'have no email'
    );
  });
});

describe('sendCalendarInvites', () => {
  it('does not use client delivery after the edge function sends email', async () => {
    const invokeServer = jest.fn().mockResolvedValue({ emailed: true });

    await expect(
      sendCalendarInvites({
        pollId: 'poll-1',
        slotId: 'slot-1',
        title: 'Dinner',
        startsAt: '2026-09-19T15:00:00.000Z',
        endsAt: '2026-09-19T17:00:00.000Z',
        invitees: [
          {
            memberId: 'm1',
            displayName: 'Alice',
            email: 'a@example.com',
            response: 'yes',
          },
        ],
        invokeServer,
      })
    ).resolves.toBe('server');
    expect(invokeServer).toHaveBeenCalledWith({ poll_id: 'poll-1', slot_id: 'slot-1' });
  });
});
