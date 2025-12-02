import { Platform, ViewStyle } from 'react-native';

/**
 * Elevation system for consistent shadow/depth across platforms
 * iOS uses shadow properties, Android uses elevation
 */

export const elevationPresets = {
  // No shadow/elevation
  none: {
    ios: {},
    android: {},
  },

  // Subtle shadow - for interactive elements like buttons
  sm: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    } as ViewStyle,
    android: {
      elevation: 2,
    } as ViewStyle,
  },

  // Medium shadow - for cards and containers
  md: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } as ViewStyle,
    android: {
      elevation: 4,
    } as ViewStyle,
  },

  // Large shadow - for modals and overlays
  lg: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    } as ViewStyle,
    android: {
      elevation: 8,
    } as ViewStyle,
  },

  // Extra large shadow - for prominent overlays
  xl: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    } as ViewStyle,
    android: {
      elevation: 16,
    } as ViewStyle,
  },
};

export type ElevationLevel = keyof typeof elevationPresets;

export const getElevation = (level: ElevationLevel): ViewStyle => {
  const preset = elevationPresets[level];
  return Platform.select({
    ios: preset.ios,
    android: preset.android,
    default: preset.ios,
  }) as ViewStyle;
};

export default elevationPresets;
