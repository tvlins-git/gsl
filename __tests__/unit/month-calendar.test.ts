import { monthGrid } from '@/components/MonthCalendar';

describe('monthGrid', () => {
  it('lays out a Monday-first month with every day', () => {
    // 1 Sep 2026 is a Tuesday, so one leading empty cell. 30 days.
    const cells = monthGrid(2026, 8);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBe(1);
    const days = cells.filter((day) => day != null);
    expect(days).toHaveLength(30);
    expect(days[days.length - 1]).toBe(30);
    expect(cells.length % 7).toBe(0);
  });
});