import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

/**
 * Native camera picker (`UIImagePickerController` sourceType camera) crashes on
 * iOS Simulator because there is no camera hardware. `Device.isDevice` is false
 * on Simulator/emulator and true on physical devices (and web).
 */
export function isCameraAvailable(): boolean {
  return Device.isDevice === true;
}

export async function launchCameraForPhoto(): Promise<string | null> {
  if (!isCameraAvailable()) return null;

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({ quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
