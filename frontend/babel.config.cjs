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
  };
};
