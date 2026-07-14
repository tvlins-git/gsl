import { computeSlotScores } from '@/lib/polls';

describe('poll voting flow', () => {
  it('create poll → vote → compute best slot', () => {
    const slotIds = ['slot-a', 'slot-b'];
    const members = ['m1', 'm2', 'm3'];

    let responses: { slotId: string; memberId: string; response: 'yes' | 'maybe' | 'no' }[] = [];

    // Members vote on slot-a
    for (const m of members) {
      responses.push({ slotId: 'slot-a', memberId: m, response: 'yes' });
    }
    // Mixed votes on slot-b
    responses.push({ slotId: 'slot-b', memberId: 'm1', response: 'yes' });
    responses.push({ slotId: 'slot-b', memberId: 'm2', response: 'no' });

    const scores = computeSlotScores(slotIds, responses, members.length);
    expect(scores[0].slotId).toBe('slot-a');
    expect(scores[0].everyoneAvailable).toBe(true);
  });
});
