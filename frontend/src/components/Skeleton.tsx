/**
 * Skeleton - Base shimmer animation component for loading states
 * Creates a smooth, animated placeholder that indicates content is loading
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Animated, DimensionValue } from 'react-native';
import { useShimmer } from '../utils/animations';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../theme/spacing';

interface SkeletonProps {
  /** Width of the skeleton (number for pixels, string for percentage) */
  width?: DimensionValue;
  /** Height of the skeleton (number for pixels, string for percentage) */
  height?: DimensionValue;
  /** Border radius (default: md) */
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | number;
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to show shimmer animation (default: true) */
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 'md',
  style,
  animated = true,
}) => {
  const { colors } = useTheme();
  const shimmerValue = useShimmer();

  const getBorderRadius = (): number => {
    if (typeof borderRadius === 'number') return borderRadius;
    return Spacing.borderRadius[borderRadius] || Spacing.borderRadius.md;
  };

  const baseStyle: ViewStyle = {
    width,
    height,
    borderRadius: getBorderRadius(),
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  };

  // Shimmer overlay that moves across the skeleton
  const shimmerStyle = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gray100,
    opacity: shimmerValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.7, 0.3],
    }),
  };

  return (
    <View style={[baseStyle, style]}>
      {animated && <Animated.View style={shimmerStyle} />}
    </View>
  );
};

/**
 * SkeletonCircle - Circular skeleton for avatars, icons, etc.
 */
interface SkeletonCircleProps {
  /** Diameter of the circle */
  size?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to show shimmer animation */
  animated?: boolean;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 48,
  style,
  animated = true,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="full"
      style={style}
      animated={animated}
    />
  );
};

/**
 * SkeletonCard - Card-shaped skeleton placeholder
 */
interface SkeletonCardProps {
  /** Height of the card */
  height?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to show shimmer animation */
  animated?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  height = 120,
  style,
  animated = true,
}) => {
  return (
    <Skeleton
      width="100%"
      height={height}
      borderRadius="lg"
      style={style}
      animated={animated}
    />
  );
};

export default Skeleton;
