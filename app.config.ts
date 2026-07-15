import { ExpoConfig, ConfigContext } from 'expo/config';

// Inlined for Expo config load — Node cannot resolve ./constants/brand.ts at config time.
const APP_NAME = 'GSL';
const APP_SLUG = 'gsl';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_SLUG,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gsl.app',
    infoPlist: {
      NSCameraUsageDescription: 'GSL needs camera access to upload event photos.',
      NSPhotoLibraryUsageDescription: 'GSL needs photo library access to upload event photos.',
    },
  },
  android: {
    package: 'com.gsl.app',
    adaptiveIcon: {
      backgroundColor: '#ffffff',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#000000',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'GSL needs access to your photos for event albums.',
        cameraPermission: 'GSL needs camera access to take event photos.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
});
