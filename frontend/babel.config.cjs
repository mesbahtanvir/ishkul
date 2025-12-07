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
      // Note: babel-plugin-transform-remove-console was removed because it causes
      // build failures in web/CI environments. Console statements are left in for now.
      // If needed for native production builds, add it as a devDependency and configure
      // it in a native-specific build config.
    ].filter(Boolean),
    // Note: Not using babel-plugin-transform-import-meta due to build issues
    // Instead, we handle import.meta removal via post-build script
    // See scripts/fix-import-meta.js
  };
};
