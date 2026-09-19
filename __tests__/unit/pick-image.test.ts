import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import {
  pickImageFromCamera,
  pickImageFromGallery,
  SINGLE_IMAGE_PICKER_OPTIONS,
} from '@/lib/pick-image';

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockedPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

function setIsDevice(value: boolean) {
  Object.defineProperty(Device, 'isDevice', {
    configurable: true,
    value,
  });
}

describe('SINGLE_IMAGE_PICKER_OPTIONS', () => {
  it('forces single-select PHPicker (tap confirms, no Add/Done)', () => {
    expect(SINGLE_IMAGE_PICKER_OPTIONS.allowsMultipleSelection).toBe(false);
    expect(SINGLE_IMAGE_PICKER_OPTIONS.selectionLimit).toBe(1);
  });
});

describe('pickImageFromGallery', () => {
  afterEach(() => jest.clearAllMocks());

  it('opens the library with single-selection options', async () => {
    mockedPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://gallery.jpg' }],
    } as never);
    await expect(pickImageFromGallery()).resolves.toBe('file://gallery.jpg');
    expect(mockedPicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: false,
        selectionLimit: 1,
        mediaTypes: ['images'],
      })
    );
  });
});

describe('pickImageFromCamera', () => {
  afterEach(() => {
    setIsDevice(true);
    jest.clearAllMocks();
  });

  it('does not launch the camera picker when hardware is unavailable', async () => {
    setIsDevice(false);
    await expect(pickImageFromCamera()).resolves.toBeNull();
    expect(mockedPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('launches the camera picker with single-selection options', async () => {
    setIsDevice(true);
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockedPicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    } as never);
    await expect(pickImageFromCamera()).resolves.toBe('file://photo.jpg');
    expect(mockedPicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: false,
        selectionLimit: 1,
      })
    );
  });
});
