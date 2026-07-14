export interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

export interface CompressResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export function calculateScaledDimensions(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.round(height * ratio),
  };
}

export function estimateJpegSize(width: number, height: number, quality: number): number {
  const pixels = width * height;
  const bytesPerPixel = 0.15 * (quality / 100);
  return Math.round(pixels * bytesPerPixel);
}

export function computeHeuristicScore(width: number, height: number): number {
  const megapixels = (width * height) / 1_000_000;
  const resolutionScore = Math.min(megapixels / 12, 1) * 50;
  const aspectScore = Math.abs(width / height - 4 / 3) < 0.3 ? 25 : 15;
  return Math.round(resolutionScore + aspectScore + 25);
}

export async function compressImage(
  uri: string,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const { maxWidth = 1200, quality = 0.8 } = options;

  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: false }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch {
    return { uri, width: maxWidth, height: Math.round(maxWidth * 0.75) };
  }
}
