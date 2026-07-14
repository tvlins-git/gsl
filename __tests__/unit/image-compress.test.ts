import { calculateScaledDimensions, computeHeuristicScore } from '@/lib/image-compress';

describe('calculateScaledDimensions', () => {
  it('scales down wide images', () => {
    const result = calculateScaledDimensions(2400, 1800, 1200);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it('keeps small images unchanged', () => {
    const result = calculateScaledDimensions(800, 600, 1200);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});

describe('computeHeuristicScore', () => {
  it('returns higher score for larger images', () => {
    const large = computeHeuristicScore(4000, 3000);
    const small = computeHeuristicScore(640, 480);
    expect(large).toBeGreaterThan(small);
  });
});
