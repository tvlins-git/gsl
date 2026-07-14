import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { computePhotoScore } from './scoring.ts';

Deno.test('computePhotoScore rewards faces and quality', () => {
  const score = computePhotoScore({ safeSearchScore: 1, faceCount: 3, qualityScore: 0.8 });
  assertEquals(score > 50, true);
});

Deno.test('computePhotoScore penalizes unsafe content', () => {
  const score = computePhotoScore({ safeSearchScore: 0.1, faceCount: 2, qualityScore: 0.9 });
  assertEquals(score, 0);
});

Deno.test('computePhotoScore caps face bonus at 5 faces', () => {
  const five = computePhotoScore({ safeSearchScore: 1, faceCount: 5, qualityScore: 0.5 });
  const ten = computePhotoScore({ safeSearchScore: 1, faceCount: 10, qualityScore: 0.5 });
  assertEquals(five, ten);
});
