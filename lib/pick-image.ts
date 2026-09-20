import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

export type ImagePickSource = 'camera' | 'gallery';

export type PickImageOptions = {
  /**
   * Gallery only. When true, the system picker allows selecting more than one image.
   * Camera always returns a single capture.
   */
  multiple?: boolean;
  /** Max images when `multiple` is true. Defaults to 20. Values below 1 are treated as 1. */
  selectionLimit?: number;
};

export const DEFAULT_ALBUM_SELECTION_LIMIT = 20;

const BASE_PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
};

/**
 * Build expo-image-picker options.
 *
 * Album Gallery passes `{ multiple: true }` so PHPicker / the web file input show
 * checkmarks (iOS) or a multi file picker (web/Android). After selecting, iOS
 * requires tapping **Add** (top right) — checkmarks alone do not confirm.
 *
 * On some iOS Simulator runtimes PHPicker can show checkmarks with no Add/Done
 * control. That is an Apple simulator bug, not app single-select. Cancel with X
 * and retry, or pick on a physical device. Feed stays on `multiple: false`.
 */
export function imagePickerOptions(
  source: ImagePickSource,
  options: PickImageOptions = {}
): ImagePicker.ImagePickerOptions {
  const allowMultiple = source === 'gallery' && options.multiple === true;
  const selectionLimit = allowMultiple
    ? Math.max(1, options.selectionLimit ?? DEFAULT_ALBUM_SELECTION_LIMIT)
    : 1;

  return {
    ...BASE_PICK_OPTIONS,
    allowsMultipleSelection: allowMultiple,
    selectionLimit,
    // Numbered badges make the confirm/Add step obvious on iOS 15+ PHPicker.
    orderedSelection: allowMultiple,
    // Full-screen presentation keeps the top Add bar visible more reliably than a sheet.
    presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
  };
}

function urisFromResult(result: ImagePicker.ImagePickerResult): string[] {
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((asset) => asset.uri).filter((uri): uri is string => Boolean(uri));
}

export function isCameraPickerAvailable(
  os: typeof Platform.OS = Platform.OS,
  isDevice: boolean = Device.isDevice
) {
  return os !== 'web' && isDevice;
}

export async function pickImageUris(
  source: ImagePickSource,
  options: PickImageOptions = {}
): Promise<string[]> {
  const pickerOptions = imagePickerOptions(source, options);

  if (source === 'camera') {
    if (!isCameraPickerAvailable()) return [];
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return [];
    const result = await ImagePicker.launchCameraAsync(pickerOptions);
    return urisFromResult(result);
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
  return urisFromResult(result);
}

/** Always single-select. Feed composer and other one-photo flows use this. */
export async function pickImageUri(
  source: ImagePickSource,
  options: PickImageOptions = {}
): Promise<string | null> {
  const uris = await pickImageUris(source, { ...options, multiple: false, selectionLimit: 1 });
  return uris[0] ?? null;
}
