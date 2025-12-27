/**
 * GeneratingMobileProgressBar - Skeleton progress bar shown while generating
 *
 * Displays a placeholder mobile progress bar with skeleton styling
 * while the course is being generated.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

export interface GeneratingMobileProgressBarProps {
  courseTitle?: string;
}

export const GeneratingMobileProgressBar: React.FC<GeneratingMobileProgressBarProps> = ({ courseTitle }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.mobileProgressBar, styles.generatingMobileBar, { backgroundColor: colors.background.secondary }]}
    >
      <View style={styles.mobileProgressContent}>
        <View style={styles.mobileProgressInfo}>
          <View style={styles.mobileProgressTextRow}>
            <Text style={[styles.mobileProgressLabel, { color: colors.text.secondary }]}>
              {courseTitle || 'Generating...'}
            </Text>
          </View>
          <View style={[styles.skeletonProgressBar, { backgroundColor: colors.border }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile progress bar
  mobileProgressBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  mobileProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileProgressInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  mobileProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mobileProgressLabel: {
    ...Typography.body.small,
    flex: 1,
    marginRight: Spacing.sm,
  },

  // Generating/Skeleton styles
  generatingMobileBar: {
    opacity: 0.8,
  },
  skeletonProgressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
});
