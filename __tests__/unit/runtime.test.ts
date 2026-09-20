import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { isExpoGoRuntime, shouldInstallReanimated } from '@/lib/runtime';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));

describe('shouldInstallReanimated', () => {
  it('skips Worklets/Reanimated native init inside Expo Go', () => {
    expect(shouldInstallReanimated(true)).toBe(false);
  });

  it('installs Reanimated in development and production builds', () => {
    expect(shouldInstallReanimated(false)).toBe(true);
  });
});

describe('isExpoGoRuntime', () => {
  const mockIsRunningInExpoGo = isRunningInExpoGo as jest.MockedFunction<typeof isRunningInExpoGo>;
  const constants = Constants as { appOwnership: string | null };

  beforeEach(() => {
    mockIsRunningInExpoGo.mockReset();
    constants.appOwnership = null;
  });

  it('is true when the ExpoGo native module is present', () => {
    mockIsRunningInExpoGo.mockReturnValue(true);
    expect(isExpoGoRuntime()).toBe(true);
  });

  it('is true when Constants.appOwnership is expo', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    constants.appOwnership = 'expo';
    expect(isExpoGoRuntime()).toBe(true);
  });

  it('is false in standalone and dev-client builds', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    constants.appOwnership = 'standalone';
    expect(isExpoGoRuntime()).toBe(false);
  });
});
