import * as Device from 'expo-device';
import { isCameraAvailable } from '@/lib/camera';

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
}));

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
