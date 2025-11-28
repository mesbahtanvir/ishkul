/**
 * Modern Minimalist Color Palette
 * Inspired by contemporary design systems
 */

export const Colors = {
  // Primary Colors
  primary: '#0066FF',        // Vibrant blue
  primaryLight: '#E6F0FF',
  primaryDark: '#0052CC',

  // Secondary Colors
  secondary: '#6B7280',      // Neutral gray
  secondaryLight: '#F3F4F6',
  secondaryDark: '#374151',

  // Accent Colors
  success: '#10B981',        // Green
  warning: '#F59E0B',        // Amber
  danger: '#EF4444',         // Red
  info: '#3B82F6',           // Blue

  // iOS-style Accent Colors (for consistent mobile UI)
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

export default Colors;
