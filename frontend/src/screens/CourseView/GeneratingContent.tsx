/**
 * GeneratingContent - shown while course outline is being generated
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// Progress messages for generating state (rotate every 3s)
export const GENERATING_MESSAGES = [
  'Analyzing your learning goal...',
  'Designing personalized curriculum...',
  'Structuring course modules...',
  'Creating topic breakdowns...',
  'Optimizing learning sequence...',
  'Almost ready...',
];

interface GeneratingContentProps {
  courseTitle?: string;
}

export const GeneratingContent: React.FC<GeneratingContentProps> = ({ courseTitle }) => {
  const { colors } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % GENERATING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.generatingContainer}>
      <View style={styles.generatingContent}>
        <Text style={[styles.generatingMessage, { color: colors.text.primary }]}>
          {GENERATING_MESSAGES[messageIndex]}
        </Text>
        <View style={styles.generatingDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay1, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay2, { backgroundColor: colors.primary }]} />
        </View>
        {courseTitle && (
          <Text style={[styles.generatingCourseTitle, { color: colors.text.secondary }]}>
            {courseTitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  generatingContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  generatingMessage: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  generatingDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  dotDelay1: {
    opacity: 0.4,
  },
  dotDelay2: {
    opacity: 0.2,
  },
  generatingCourseTitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
