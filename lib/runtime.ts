import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

/**
 * True only inside Expo Go — not a development build or production binary.
 *
 * `Constants.executionEnvironment === 'storeClient'` also matches expo-dev-client,
 * so it must not be used alone.
 */
export function isExpoGoRuntime(): boolean {
  if (isRunningInExpoGo()) return true;
  return Constants.appOwnership === 'expo';
}

/**
 * Reanimated’s side-effect import installs Worklets turbo modules. In Expo Go that
 * native init SIGSEGVs (Hermes `cloneString` / `JSIWorkletsModuleProxy::toOptimizedObject`)
 * when the JS patch version does not match the binaries inside the store client —
 * the version check only compares major.minor, so 0.10.0 vs 0.10.1 never RedBoxes.
 *
 * GSL does not call Reanimated APIs: Feed swipe-to-delete uses RNGH `Swipeable`,
 * and the album PhotoViewer uses React Native `Animated`. Skip the native install
 * in Expo Go; keep it in dev/production builds so future animations still work.
 */
export function shouldInstallReanimated(isExpoGo: boolean): boolean {
  return !isExpoGo;
}
