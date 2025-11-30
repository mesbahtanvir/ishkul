// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Override the default transformer to ensure zustand is transformed
// Metro normally skips node_modules for performance, but zustand contains
// import.meta that needs transformation for web builds
const originalTransformerTransform = config.transformer.babelTransformerPath;

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  // Ensure zustand and dependencies get transformed
  enableBabelRCLookup: true,
  enableBabelRuntime: true,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Update resolver to handle ESM extensions
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || [])],
  // Enable transformation of specific packages
  // By default, Metro ignores node_modules - we need to whitelist zustand
  resolverMainFields: ['browser', 'main'],
};

module.exports = config;

