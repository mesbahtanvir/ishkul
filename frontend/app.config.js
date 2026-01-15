// Dynamic Expo configuration
// Conditionally excludes native-only plugins for web builds
// Note: Environment variable injection is handled by scripts/inject-env.js

const baseConfig = require('./app.json');

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
