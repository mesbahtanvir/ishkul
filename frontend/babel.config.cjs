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
    // Note: Not using babel-plugin-transform-import-meta due to build issues
    // Instead, we handle import.meta removal via post-build script
    // See scripts/fix-import-meta.js
  };
};
