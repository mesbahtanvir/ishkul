module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Transform import.meta to work in non-ESM environments
          // Required for Expo SDK 54 web builds with ESM dependencies
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      // Apply import.meta transformation globally for all packages
      // This catches cases where import.meta.env is used (like in Zustand devtools)
      'transform-import-meta',
    ],
    // Additional override for packages specifically using import.meta
    // Based on workaround from https://github.com/expo/expo/issues/30323
    overrides: [
      {
        test: /node_modules\/(zustand|@payloadcms)/,
        plugins: [
          ['transform-import-meta', {
            // Transform import.meta.env.MODE to process.env.NODE_ENV
            env: { MODE: process.env.NODE_ENV || 'production' }
          }],
        ],
      },
    ],
  };
};
