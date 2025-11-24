/**
 * Modern Typography System
 * Mobile-first, clean, and readable
 */

export const Typography = {
  // Display Sizes (Hero content)
  display: {
    large: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    small: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
  },

  // Heading Sizes
  heading: {
    h1: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    h2: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    h3: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    h4: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },

  // Body Text
  body: {
    large: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
      letterSpacing: 0.3,
    },
  },

  // Label/Caption Text
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
    },
    medium: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
    },
  },

  // Button Text
  button: {
    large: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },
};

export default Typography;
