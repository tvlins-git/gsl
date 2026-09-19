import { firstName, formatRelativeTime } from '@/lib/time';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-13T16:00:00.000Z');

  it('returns just now for very recent times', () => {
    expect(formatRelativeTime('2026-07-13T15:59:30.000Z', now)).toBe('just now');
  });

  it('returns minutes and hours', () => {
    expect(formatRelativeTime('2026-07-13T15:40:00.000Z', now)).toBe('20m');
    expect(formatRelativeTime('2026-07-13T13:00:00.000Z', now)).toBe('3h');
  });

  it('returns days for older timestamps', () => {
    expect(formatRelativeTime('2026-07-11T16:00:00.000Z', now)).toBe('2d');
  });
});

describe('firstName', () => {
  it('returns the first token', () => {
    expect(firstName('Hr. Lins')).toBe('Lins');
    expect(firstName('Alice')).toBe('Alice');
  });
});
