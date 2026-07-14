import { generateMonthList, monthKey } from '@/lib/hosts';

describe('generateMonthList', () => {
  it('generates 12 months by default', () => {
    const months = generateMonthList(12, new Date('2026-07-15'));
    expect(months).toHaveLength(12);
    expect(months[0].label).toBe('Jul 2026');
    expect(months[0].isCurrent).toBe(true);
  });

  it('marks next month correctly', () => {
    const months = generateMonthList(12, new Date('2026-07-15'));
    expect(months[1].isNext).toBe(true);
    expect(months[1].label).toBe('Aug 2026');
  });

  it('rolls over year boundary', () => {
    const months = generateMonthList(3, new Date('2026-12-01'));
    expect(months[0].month).toBe(12);
    expect(months[1].label).toBe('Jan 2027');
  });
});

describe('monthKey', () => {
  it('formats zero-padded month', () => {
    expect(monthKey(2026, 3)).toBe('2026-03');
    expect(monthKey(2026, 12)).toBe('2026-12');
  });
});
