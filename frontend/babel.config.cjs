module.exports = function (api) {
  api.cache(true);

  // Remove console.* statements in production builds
  const removeConsolePlugin =
    process.env.NODE_ENV === 'production'
      ? ['transform-remove-console', { exclude: ['error', 'warn'] }]
      : null;

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
      // Remove console.log/info/debug in production, keep console.error/warn for error tracking
      removeConsolePlugin,
    ].filter(Boolean),
    // Note: Not using babel-plugin-transform-import-meta due to build issues
    // Instead, we handle import.meta removal via post-build script
    // See scripts/fix-import-meta.js
  };
};
