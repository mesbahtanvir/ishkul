// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to handle ESM packages better
// This helps with packages like Zustand that use import.meta
config.resolver = {
  ...config.resolver,
  // Prioritize browser-specific builds for web platform
  resolverMainFields: ['browser', 'module', 'main'],
};

module.exports = config;

