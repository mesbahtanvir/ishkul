/**
 * Responsive Design Hook
 * Provides adaptive values based on screen dimensions
 */

import { useWindowDimensions } from 'react-native';

// Breakpoints based on DESIGN_SYSTEM.md
const BREAKPOINTS = {
  smallPhone: 320,
  standardPhone: 390,
  largePhone: 430,
  tablet: 768,
};

export interface ResponsiveValues {
  // Screen dimensions
  width: number;
  height: number;

  // Device type flags
  isSmallPhone: boolean;
  isStandardPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;

  // Orientation
  isLandscape: boolean;
  isPortrait: boolean;

  // Convenience helpers
  isMobile: boolean;

  // Responsive value helper
  responsive: <T>(small: T, standard: T, large?: T, tablet?: T) => T;

  // Responsive font scale
  fontScale: number;

  // Responsive spacing scale
  spacingScale: number;
}

export const useResponsive = (): ResponsiveValues => {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < BREAKPOINTS.standardPhone;
  const isStandardPhone = width >= BREAKPOINTS.standardPhone && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet;

  const isLandscape = width > height;
  const isPortrait = height >= width;

  const isMobile = width < BREAKPOINTS.tablet;

  // Font scale: smaller screens get slightly smaller fonts
  const fontScale = isSmallPhone ? 0.9 : isTablet ? 1.1 : 1;

  // Spacing scale: smaller screens get tighter spacing
  const spacingScale = isSmallPhone ? 0.85 : isTablet ? 1.15 : 1;

  // Helper function to get responsive values
  const responsive = <T>(small: T, standard: T, large?: T, tablet?: T): T => {
    if (isTablet && tablet !== undefined) return tablet;
    if (isLargePhone && large !== undefined) return large;
    if (isSmallPhone) return small;
    return standard;
  };

  return {
    width,
    height,
    isSmallPhone,
    isStandardPhone,
    isLargePhone,
    isTablet,
    isLandscape,
    isPortrait,
    isMobile,
    responsive,
    fontScale,
    spacingScale,
  };
};

export default useResponsive;
