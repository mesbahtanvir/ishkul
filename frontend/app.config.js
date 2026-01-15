// Dynamic Expo configuration
// Conditionally excludes native-only plugins for web builds

const baseConfig = require('./app.json');

// Debug: Log env vars when Expo config is loaded
console.log('[Expo Config] Environment variables check:', {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
  NODE_ENV: process.env.NODE_ENV,
});

module.exports = ({ config }) => {
  const isWeb = process.env.EXPO_PLATFORM === 'web' ||
                process.argv.includes('--platform') && process.argv.includes('web') ||
                process.argv.some(arg => arg.includes('web'));

  // Native-only plugins that should be excluded for web builds
  const nativeOnlyPlugins = [
    '@stripe/stripe-react-native',
  ];

  // Filter out native-only plugins for web builds
  let plugins = baseConfig.expo.plugins || [];
  if (isWeb) {
    plugins = plugins.filter(plugin => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      return !nativeOnlyPlugins.includes(pluginName);
    });
  }

  return {
    ...baseConfig.expo,
    ...config,
    plugins,
  };
};
