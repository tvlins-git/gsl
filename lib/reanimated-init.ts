import { isExpoGoRuntime, shouldInstallReanimated } from '@/lib/runtime';

if (shouldInstallReanimated(isExpoGoRuntime())) {
  // Conditional native install — static import would load Worklets in Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-reanimated');
}
