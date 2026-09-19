import * as Device from 'expo-device';

/**
 * Native camera picker (`UIImagePickerController` sourceType camera) crashes on
 * iOS Simulator because there is no camera hardware. `Device.isDevice` is false
 * on Simulator/emulator and true on physical devices (and web).
 */
export function isCameraAvailable(): boolean {
  return Device.isDevice === true;
}
