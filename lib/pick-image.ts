import * as ImagePicker from 'expo-image-picker';
import { isCameraAvailable } from './camera';

/** Force PHPicker into single-select so one tap confirms and dismisses (no Add/Done bar). */
export const SINGLE_IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsMultipleSelection: false,
  selectionLimit: 1,
};

export async function pickImageFromGallery(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(SINGLE_IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function pickImageFromCamera(): Promise<string | null> {
  if (!isCameraAvailable()) return null;

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync(SINGLE_IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
