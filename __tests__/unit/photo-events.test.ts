jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => true),
  localStore: {},
}));

import { formatEventDate, formatPhotoCount } from '@/lib/photo-events';

describe('photo-events formatters', () => {
  it('formats event date', () => {
    const formatted = formatEventDate('2026-07-13T16:00:00.000Z');
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/13/);
  });

  it('formats photo count', () => {
    expect(formatPhotoCount(0)).toBe('0 photos');
    expect(formatPhotoCount(1)).toBe('1 photo');
    expect(formatPhotoCount(5)).toBe('5 photos');
  });
});
