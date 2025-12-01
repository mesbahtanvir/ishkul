// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to handle ESM packages with import.meta
// Based on workaround from https://github.com/expo/expo/issues/30323
config.resolver = {
  ...config.resolver,
  // Prioritize browser-specific builds for web platform
  resolverMainFields: ['browser', 'module', 'main'],
};

module.exports = config;

