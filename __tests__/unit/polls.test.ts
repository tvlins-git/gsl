import { buildPollSlot, buildPollSlotFromDates, computeSlotScores, responseLabel, summarizePollAcceptance } from '@/lib/polls';

describe('computeSlotScores', () => {
  const slotIds = ['s1', 's2'];
  const responses = [
    { slotId: 's1', memberId: 'm1', response: 'yes' as const },
    { slotId: 's1', memberId: 'm2', response: 'yes' as const },
    { slotId: 's1', memberId: 'm3', response: 'maybe' as const },
    { slotId: 's2', memberId: 'm1', response: 'no' as const },
    { slotId: 's2', memberId: 'm2', response: 'yes' as const },
  ];

  it('ranks slots by availability score', () => {
    const scores = computeSlotScores(slotIds, responses, 3);
    expect(scores[0].slotId).toBe('s1');
    expect(scores[0].yesCount).toBe(2);
    expect(scores[0].maybeCount).toBe(1);
  });

  it('detects when everyone is available', () => {
    const allYes = [
      { slotId: 's1', memberId: 'm1', response: 'yes' as const },
      { slotId: 's1', memberId: 'm2', response: 'yes' as const },
    ];
    const scores = computeSlotScores(['s1'], allYes, 2);
    expect(scores[0].everyoneAvailable).toBe(true);
  });
});

describe('responseLabel', () => {
  it('returns human labels', () => {
    expect(responseLabel('yes')).toBe('Available');
    expect(responseLabel('maybe')).toBe('Maybe');
    expect(responseLabel('no')).toBe('Not available');
  });
});

describe('buildPollSlot', () => {
  it('parses date and time range', () => {
    const result = buildPollSlot('2026-09-19', '17:00', '19:00');
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.startsAt).toContain('2026-09-19');
      expect(new Date(result.endsAt).getTime()).toBeGreaterThan(new Date(result.startsAt).getTime());
    }
  });

  it('rejects free-text dates like Friday 17-19', () => {
    const result = buildPollSlot('Friday 17-19', '17:00', '19:00');
    expect(result).toEqual({ error: 'Date must be YYYY-MM-DD (e.g. 2026-09-19)' });
  });

  it('rejects end before start', () => {
    const result = buildPollSlot('2026-09-19', '19:00', '17:00');
    expect(result).toEqual({ error: 'End time must be after start time' });
  });
});

describe('buildPollSlotFromDates', () => {
  it('builds a 2-hour slot from Date objects', () => {
    const date = new Date(2026, 8, 19);
    const start = new Date(2026, 8, 19, 17, 0, 0);
    const result = buildPollSlotFromDates(date, start);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      const duration =
        (new Date(result.endsAt).getTime() - new Date(result.startsAt).getTime()) / (1000 * 60 * 60);
      expect(duration).toBe(2);
    }
  });
});

describe('summarizePollAcceptance', () => {
  const names = { m1: 'Hr. Lins', m2: 'Alex' };

  it('shows no responses when empty', () => {
    expect(summarizePollAcceptance([], names)).toBe('No responses yet');
  });

  it('lists members who marked yes', () => {
    const result = summarizePollAcceptance(
      [
        { slotId: 's1', memberId: 'm1', response: 'yes' },
        { slotId: 's2', memberId: 'm1', response: 'yes' },
      ],
      names
    );
    expect(result).toBe('Available: Hr. Lins (2 slots)');
  });

  it('handles maybe-only responses', () => {
    const result = summarizePollAcceptance(
      [{ slotId: 's1', memberId: 'm1', response: 'maybe' }],
      names
    );
    expect(result).toBe('1 responded — no one available yet');
  });
});
