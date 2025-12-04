// Dynamic Expo configuration for environment-specific builds
// This file takes precedence over app.json when both exist

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';
const IS_PROD = process.env.APP_ENV === 'production';

// Determine app variant suffix for non-production builds
const getAppVariant = () => {
  if (IS_DEV) return ' (Dev)';
  if (IS_PREVIEW) return ' (Preview)';
  return '';
};

// Bundle identifier suffix for different environments
const getBundleIdSuffix = () => {
  if (IS_DEV) return '.dev';
  if (IS_PREVIEW) return '.preview';
  return '';
};

export default {
  expo: {
    name: `Learn Anything${getAppVariant()}`,
    slug: 'learn-anything',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'learnanything',

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    plugins: [
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.org.ishkul',
          enableGooglePay: true,
        },
      ],
    ],

    ios: {
      supportsTablet: true,
      bundleIdentifier: `org.ishkul.learnanything${getBundleIdSuffix()}`,
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to scan documents and upload profile photos.',
        NSPhotoLibraryUsageDescription: 'This app accesses your photos to upload profile pictures and learning materials.',
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: [
        'applinks:ishkul.org',
        'applinks:staging.ishkul.org',
      ],
    },

    android: {
      package: `org.ishkul.learnanything${getBundleIdSuffix()}`,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      favicon: './assets/favicon.png',
      manifest: './public/manifest.json',
      display: 'standalone',
      barStyle: 'light-content',
      meta: {
        viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
        'theme-color': '#6366f1',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
      },
    },

    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
      appEnv: process.env.APP_ENV || 'development',
    },

    updates: {
      url: 'https://u.expo.dev/your-project-id',
    },

    runtimeVersion: {
      policy: 'appVersion',
    },

    owner: 'ishkul',
  },
};
