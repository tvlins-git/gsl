import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { isCameraAvailable, launchCameraForPhoto } from '@/lib/camera';

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockedPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

function setIsDevice(value: boolean) {
  Object.defineProperty(Device, 'isDevice', {
    configurable: true,
    value,
  });
}

describe('isCameraAvailable', () => {
  afterEach(() => setIsDevice(true));

  it('is true on a physical device', () => {
    setIsDevice(true);
    expect(isCameraAvailable()).toBe(true);
  });

  it('is false on Simulator or emulator', () => {
    setIsDevice(false);
    expect(isCameraAvailable()).toBe(false);
  });
});

describe('launchCameraForPhoto', () => {
  afterEach(() => {
    setIsDevice(true);
    jest.clearAllMocks();
  });

  it('does not launch the camera picker when hardware is unavailable', async () => {
    setIsDevice(false);
    await expect(launchCameraForPhoto()).resolves.toBeNull();
    expect(mockedPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('launches the camera picker on a real device after permission', async () => {
    setIsDevice(true);
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockedPicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    } as never);
    await expect(launchCameraForPhoto()).resolves.toBe('file://photo.jpg');
    expect(mockedPicker.launchCameraAsync).toHaveBeenCalledTimes(1);
  });
});
