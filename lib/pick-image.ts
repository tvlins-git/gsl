import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

export type ImagePickSource = 'camera' | 'gallery';

const IMAGE_PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
};

export function isCameraPickerAvailable(
  os: typeof Platform.OS = Platform.OS,
  isDevice: boolean = Device.isDevice
) {
  return os !== 'web' && isDevice;
}

export async function pickImageUri(source: ImagePickSource): Promise<string | null> {
  if (source === 'camera') {
    if (!isCameraPickerAvailable()) return null;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync(IMAGE_PICK_OPTIONS);
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICK_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
