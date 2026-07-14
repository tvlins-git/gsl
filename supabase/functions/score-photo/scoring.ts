export interface VisionResult {
  safeSearchScore: number;
  faceCount: number;
  qualityScore: number;
}

export function computePhotoScore(vision: VisionResult): number {
  const safePenalty = vision.safeSearchScore < 0.5 ? -100 : 0;
  const faceBonus = Math.min(vision.faceCount, 5) * 10;
  const quality = vision.qualityScore * 50;
  return Math.max(0, Math.round(quality + faceBonus + safePenalty));
}

export async function scoreWithVision(
  imageBase64: string,
  apiKey?: string
): Promise<{ score: number; usedFallback: boolean }> {
  if (!apiKey) {
    return { score: 50, usedFallback: true };
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: 'SAFE_SEARCH_DETECTION' },
              { type: 'FACE_DETECTION' },
              { type: 'IMAGE_PROPERTIES' },
            ],
          }],
        }),
      }
    );

    if (!response.ok) return { score: 50, usedFallback: true };

    const data = await response.json();
    const result = data.responses?.[0];
    if (!result) return { score: 50, usedFallback: true };

    const safeLevels = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    const adultLevel = result.safeSearchAnnotation?.adult ?? 'UNKNOWN';
    const safeIdx = safeLevels.indexOf(adultLevel);
    const safeSearchScore = 1 - safeIdx / (safeLevels.length - 1);

    const faceCount = result.faceAnnotations?.length ?? 0;
    const qualityScore = 0.7;

    return {
      score: computePhotoScore({ safeSearchScore, faceCount, qualityScore }),
      usedFallback: false,
    };
  } catch {
    return { score: 50, usedFallback: true };
  }
}
