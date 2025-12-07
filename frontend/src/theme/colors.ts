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
 * Modern dark theme with subtle cool undertones for a refined, premium feel
 * Designed for reduced eye strain and OLED battery savings
 */
export const DarkColors: ThemeColors = {
  // Primary Colors - vibrant blue with good contrast
  primary: '#6366F1', // Indigo - more modern than plain blue
  primaryLight: '#312E81', // Deep indigo background
  primaryDark: '#818CF8', // Lighter indigo for hover/active states

  // Secondary Colors - subtle cool gray
  secondary: '#A1A1AA',
  secondaryLight: '#3F3F46',
  secondaryDark: '#E4E4E7',

  // Accent Colors - vivid and saturated for dark backgrounds
  success: '#22C55E', // Vibrant green
  warning: '#F59E0B', // Rich amber
  danger: '#EF4444', // Bold red
  info: '#38BDF8', // Sky blue

  // iOS-style Accent Colors (enhanced for dark mode)
  ios: {
    blue: '#0A84FF',
    green: '#30D158',
    orange: '#FF9F0A',
    purple: '#BF5AF2', // Brighter purple
    gray: '#98989D',
    lightGray: '#38383A',
    systemGray6: '#1C1C1E',
  },

  // Neutral Palette - subtle blue undertone for depth
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#0C0C0E', // Near black with slight warmth
  gray100: '#18181B',
  gray200: '#27272A',
  gray300: '#3F3F46',
  gray400: '#71717A',
  gray500: '#A1A1AA',
  gray600: '#D4D4D8',
  gray700: '#E4E4E7',
  gray800: '#F4F4F5',
  gray900: '#FAFAFA',

  // Semantic Colors - refined text hierarchy
  text: {
    primary: '#F4F4F5', // Slightly warm white
    secondary: '#A1A1AA', // Medium gray
    tertiary: '#71717A', // Muted gray
    inverse: '#18181B',
  },
  background: {
    primary: '#09090B', // Deep charcoal with subtle warmth
    secondary: '#18181B', // Elevated surface
    tertiary: '#27272A', // Cards and modals
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
  border: '#27272A', // Subtle borders
  divider: '#1F1F23', // Very subtle dividers

  // UI Component Colors - rich, tinted backgrounds
  card: {
    default: '#1C1C20', // Slight blue undertone
    selected: '#1E1B4B', // Deep indigo selection
    lesson: '#052E16', // Rich forest green
    quiz: '#451A03', // Warm amber/brown
    practice: '#2E1065', // Deep purple
    stats: {
      blue: '#172554', // Deep blue
      orange: '#431407', // Deep orange/brown
      purple: '#3B0764', // Rich purple
      green: '#052E16', // Forest green
    },
  },

  // Badge Colors - vibrant and eye-catching
  badge: {
    primary: '#6366F1', // Indigo to match primary
    lesson: '#22C55E', // Bright green
    quiz: '#F59E0B', // Amber
    practice: '#A855F7', // Bright purple
    flashcard: '#EC4899', // Pink
  },

  // Result Colors - clear feedback
  result: {
    correct: '#052E16', // Deep green background
    incorrect: '#450A0A', // Deep red background
    correctText: '#4ADE80', // Bright green text
    incorrectText: '#F87171', // Bright red text
  },

  // Switch Colors
  switch: {
    trackOff: '#3F3F46',
    trackOn: '#22C55E',
    thumb: '#FFFFFF',
  },
};

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// Default export for backward compatibility
export const Colors = LightColors;

export default Colors;
