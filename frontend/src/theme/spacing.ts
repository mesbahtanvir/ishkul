/**
 * Spacing Scale
 * Based on 4px base unit for consistency
 */

export const Spacing = {
  // Base units
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Common combinations
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  margin: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  gap: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Screen padding
  screen: 16,
  screenLarge: 24,

  // Component sizes
  buttonHeight: {
    small: 40,
    medium: 48,
    large: 56,
  },

  // Border radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Icon sizes
  icon: {
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  },

  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    min: 44,
    default: 48,
  },
};

export default Spacing;
