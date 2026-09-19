import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { isExpoGoRuntime } from '@/lib/runtime';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(),
}));

const mockIsRunningInExpoGo = isRunningInExpoGo as jest.MockedFunction<typeof isRunningInExpoGo>;

describe('isExpoGoRuntime', () => {
  beforeEach(() => {
    mockIsRunningInExpoGo.mockReset();
    (Constants as { appOwnership: string | null }).appOwnership = null;
  });

  it('is true when running inside Expo Go', () => {
    mockIsRunningInExpoGo.mockReturnValue(true);
    expect(isExpoGoRuntime()).toBe(true);
  });

  it('is true when appOwnership is expo', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    (Constants as { appOwnership: string | null }).appOwnership = 'expo';
    expect(isExpoGoRuntime()).toBe(true);
  });

  it('is false in a development build or production app', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    (Constants as { appOwnership: string | null }).appOwnership = null;
    expect(isExpoGoRuntime()).toBe(false);
  });
});
