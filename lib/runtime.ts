import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

/**
 * True only inside Expo Go — not a development build or production binary.
 *
 * `Constants.executionEnvironment === 'storeClient'` also matches expo-dev-client,
 * so it must not be used alone. Push and other Expo Go–unsafe native APIs should
 * key off this helper.
 */
export function isExpoGoRuntime(): boolean {
  if (isRunningInExpoGo()) return true;
  return Constants.appOwnership === 'expo';
}
