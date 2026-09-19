import { isCameraPickerAvailable, pickImageUri } from '@/lib/pick-image';

const mockRequestCameraPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockRequestCameraPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

describe('isCameraPickerAvailable', () => {
  it('is available on native and hidden on web', () => {
    expect(isCameraPickerAvailable('ios')).toBe(true);
    expect(isCameraPickerAvailable('android')).toBe(true);
    expect(isCameraPickerAvailable('web')).toBe(false);
  });
});

describe('pickImageUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests camera permission then launches the camera', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://camera.jpg' }],
    });

    await expect(pickImageUri('camera')).resolves.toBe('file://camera.jpg');
    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchCameraAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1 });
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('requests gallery permission then launches the library', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://gallery.jpg' }],
    });

    await expect(pickImageUri('gallery')).resolves.toBe('file://gallery.jpg');
    expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1 });
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it('does not open the picker when permission is denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(pickImageUri('camera')).resolves.toBeNull();
    await expect(pickImageUri('gallery')).resolves.toBeNull();
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
