/**
 * SkeletonText - Animated text placeholder lines
 * Creates realistic text-like skeleton loading states
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { Skeleton } from './Skeleton';
import { Spacing } from '../theme/spacing';

interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;
  /** Height of each line (default: 14) */
  lineHeight?: number;
  /** Spacing between lines (default: sm) */
  spacing?: number;
  /** Width pattern for lines: 'full' | 'varied' | 'decreasing' */
  pattern?: 'full' | 'varied' | 'decreasing';
  /** Last line width percentage (default: 60 for 'varied', calculated for 'decreasing') */
  lastLineWidth?: number;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Whether to animate (default: true) */
  animated?: boolean;
}

// Pre-defined width patterns for natural-looking text
const VARIED_WIDTHS: DimensionValue[] = ['100%', '95%', '85%', '90%', '70%', '80%', '65%'];

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 14,
  spacing = Spacing.sm,
  pattern = 'varied',
  lastLineWidth = 60,
  style,
  animated = true,
}) => {
  const getLineWidth = (index: number): DimensionValue => {
    switch (pattern) {
      case 'full':
        return '100%';
      case 'decreasing':
        // Each line is slightly shorter than the previous
        const decreasePercent = 100 - (index * (100 - lastLineWidth)) / (lines - 1 || 1);
        return `${Math.max(decreasePercent, lastLineWidth)}%`;
      case 'varied':
      default:
        // Use pre-defined varied widths, with last line always shorter
        if (index === lines - 1) {
          return `${lastLineWidth}%`;
        }
        return VARIED_WIDTHS[index % VARIED_WIDTHS.length];
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={getLineWidth(index)}
          height={lineHeight}
          borderRadius="xs"
          animated={animated}
          style={index < lines - 1 ? { marginBottom: spacing } : undefined}
        />
      ))}
    </View>
  );
};

/**
 * SkeletonParagraph - Multiple paragraph skeleton
 */
interface SkeletonParagraphProps {
  /** Number of paragraphs */
  paragraphs?: number;
  /** Lines per paragraph */
  linesPerParagraph?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to animate */
  animated?: boolean;
}

export const SkeletonParagraph: React.FC<SkeletonParagraphProps> = ({
  paragraphs = 2,
  linesPerParagraph = 4,
  style,
  animated = true,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: paragraphs }).map((_, index) => (
        <SkeletonText
          key={index}
          lines={linesPerParagraph}
          pattern="varied"
          animated={animated}
          style={index < paragraphs - 1 ? { marginBottom: Spacing.lg } : undefined}
        />
      ))}
    </View>
  );
};

/**
 * SkeletonTitle - Title-like skeleton with larger height
 */
interface SkeletonTitleProps {
  /** Width of the title (default: 70%) */
  width?: DimensionValue;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to animate */
  animated?: boolean;
}

export const SkeletonTitle: React.FC<SkeletonTitleProps> = ({
  width = '70%',
  size = 'medium',
  style,
  animated = true,
}) => {
  const heights = {
    small: 18,
    medium: 24,
    large: 32,
  };

  return (
    <Skeleton
      width={width}
      height={heights[size]}
      borderRadius="sm"
      style={style}
      animated={animated}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default SkeletonText;
