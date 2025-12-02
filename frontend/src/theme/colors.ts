/**
 * Modern Minimalist Color Palette
 * Inspired by contemporary design systems
 * Supports Light and Dark mode
 */

// Type definition for theme colors
export interface ThemeColors {
  // Primary Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary Colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // Accent Colors
  success: string;
  warning: string;
  danger: string;
  info: string;

  // iOS-style Accent Colors
  ios: {
    blue: string;
    green: string;
    orange: string;
    purple: string;
    gray: string;
    lightGray: string;
    systemGray6: string;
  };

  // Neutral Palette
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;

  // Semantic Colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
  };
  border: string;
  divider: string;

  // UI Component Colors
  card: {
    default: string;
    selected: string;
    lesson: string;
    quiz: string;
    practice: string;
    stats: {
      blue: string;
      orange: string;
      purple: string;
      green: string;
    };
  };

  // Badge Colors
  badge: {
    primary: string;
    lesson: string;
    quiz: string;
    practice: string;
    flashcard: string;
  };

  // Result Colors
  result: {
    correct: string;
    incorrect: string;
    correctText: string;
    incorrectText: string;
  };

  // Switch Colors
  switch: {
    trackOff: string;
    trackOn: string;
    thumb: string;
  };
}

/**
 * Light Theme Colors (Default)
 */
export const LightColors: ThemeColors = {
  // Primary Colors
  primary: '#0066FF',
  primaryLight: '#E6F0FF',
  primaryDark: '#0052CC',

  // Secondary Colors
  secondary: '#6B7280',
  secondaryLight: '#F3F4F6',
  secondaryDark: '#374151',

  // Accent Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // iOS-style Accent Colors
  ios: {
    blue: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
    purple: '#5856D6',
    gray: '#8E8E93',
    lightGray: '#E5E5EA',
    systemGray6: '#F2F2F7',
  },

  // Neutral Palette
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic Colors
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // UI Component Colors
  card: {
    default: '#F2F2F7',
    selected: '#E3F2FF',
    lesson: '#E7F7EF',
    quiz: '#FFE8D6',
    practice: '#E8E3FF',
    stats: {
      blue: '#E3F2FF',
      orange: '#FFE8D6',
      purple: '#E8E3FF',
      green: '#E7F7EF',
    },
  },

  // Badge Colors
  badge: {
    primary: '#007AFF',
    lesson: '#34C759',
    quiz: '#FF9500',
    practice: '#5856D6',
    flashcard: '#FF2D55',
  },

  // Result Colors
  result: {
    correct: '#E7F7EF',
    incorrect: '#FFE8E8',
    correctText: '#10B981',
    incorrectText: '#EF4444',
  },

  // Switch Colors
  switch: {
    trackOff: '#E5E5EA',
    trackOn: '#34C759',
    thumb: '#FFFFFF',
  },
};

/**
 * Dark Theme Colors
 * Designed for reduced eye strain and OLED battery savings
 */
export const DarkColors: ThemeColors = {
  // Primary Colors - slightly brighter for dark backgrounds
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  primaryDark: '#60A5FA',

  // Secondary Colors
  secondary: '#9CA3AF',
  secondaryLight: '#374151',
  secondaryDark: '#D1D5DB',

  // Accent Colors - slightly brighter for visibility
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  // iOS-style Accent Colors (adjusted for dark mode)
  ios: {
    blue: '#0A84FF',
    green: '#30D158',
    orange: '#FF9F0A',
    purple: '#5E5CE6',
    gray: '#98989D',
    lightGray: '#3A3A3C',
    systemGray6: '#1C1C1E',
  },

  // Neutral Palette (inverted for dark mode)
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#18181B',
  gray100: '#27272A',
  gray200: '#3F3F46',
  gray300: '#52525B',
  gray400: '#71717A',
  gray500: '#A1A1AA',
  gray600: '#D4D4D8',
  gray700: '#E4E4E7',
  gray800: '#F4F4F5',
  gray900: '#FAFAFA',

  // Semantic Colors (inverted)
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#111827',
  },
  background: {
    primary: '#0F0F0F',
    secondary: '#1A1A1A',
    tertiary: '#262626',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  border: '#374151',
  divider: '#27272A',

  // UI Component Colors (darker versions)
  card: {
    default: '#1C1C1E',
    selected: '#1E3A5F',
    lesson: '#14392B',
    quiz: '#3D2814',
    practice: '#2D2654',
    stats: {
      blue: '#1E3A5F',
      orange: '#3D2814',
      purple: '#2D2654',
      green: '#14392B',
    },
  },

  // Badge Colors (same as light, good contrast on dark)
  badge: {
    primary: '#0A84FF',
    lesson: '#30D158',
    quiz: '#FF9F0A',
    practice: '#5E5CE6',
    flashcard: '#FF375F',
  },

  // Result Colors (darker backgrounds)
  result: {
    correct: '#14392B',
    incorrect: '#3D1C1C',
    correctText: '#34D399',
    incorrectText: '#F87171',
  },

  // Switch Colors
  switch: {
    trackOff: '#3A3A3C',
    trackOn: '#30D158',
    thumb: '#FFFFFF',
  },
};

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// Default export for backward compatibility
export const Colors = LightColors;

export default Colors;
