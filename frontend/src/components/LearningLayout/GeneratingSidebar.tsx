/**
 * GeneratingSidebar - Blurred skeleton sidebar shown while course is being generated
 *
 * Displays a placeholder skeleton with blur overlay while the course outline
 * is being created by the AI.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

const SIDEBAR_WIDTH = 320;

export interface GeneratingSidebarProps {
  courseTitle?: string;
}

export const GeneratingSidebar: React.FC<GeneratingSidebarProps> = ({ courseTitle }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.sidebar,
        styles.generatingSidebar,
        { backgroundColor: colors.background.secondary, borderRightColor: colors.border },
      ]}
    >
      {/* Header skeleton */}
      <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.sidebarHeaderContent}>
          <View style={[styles.skeletonLine, styles.skeletonTitle, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonLine, styles.skeletonSubtitle, { backgroundColor: colors.border }]} />
        </View>
      </View>

      {/* Course progress skeleton */}
      <View style={[styles.courseProgress, { backgroundColor: colors.background.primary }]}>
        <View style={styles.courseProgressHeader}>
          <Text style={[styles.courseProgressTitle, { color: colors.text.secondary }]} numberOfLines={1}>
            {courseTitle || 'Creating course...'}
          </Text>
        </View>
        <View style={[styles.skeletonProgressBar, { backgroundColor: colors.border }]} />
      </View>

      {/* Skeleton sections */}
      <View style={styles.sectionsList}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.sectionCard,
              styles.skeletonSection,
              { borderColor: colors.border, opacity: 0.6 - i * 0.15 },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View
                  style={[
                    styles.sectionNumber,
                    styles.skeletonCircle,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.sectionInfo}>
                  <View style={[styles.skeletonLine, styles.skeletonSectionTitle, { backgroundColor: colors.border }]} />
                  <View style={[styles.skeletonLine, styles.skeletonSectionStats, { backgroundColor: colors.border }]} />
                  <View style={[styles.skeletonProgressBar, { backgroundColor: colors.border }]} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Blur overlay */}
      <View style={styles.blurOverlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Sidebar
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  sidebarHeaderContent: {
    flex: 1,
  },

  // Course progress
  courseProgress: {
    padding: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  courseProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  courseProgressTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },

  // Sections list
  sectionsList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },

  // Section card
  sectionCard: {
    marginBottom: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  sectionInfo: {
    flex: 1,
  },

  // Generating/Skeleton styles
  generatingSidebar: {
    position: 'relative',
    overflow: 'hidden',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  skeletonLine: {
    borderRadius: 4,
    height: 12,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    width: '50%',
    height: 12,
  },
  skeletonProgressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  skeletonSection: {
    paddingBottom: Spacing.sm,
  },
  skeletonCircle: {
    width: 24,
    height: 24,
  },
  skeletonSectionTitle: {
    width: '80%',
    height: 14,
    marginBottom: 4,
  },
  skeletonSectionStats: {
    width: '60%',
    height: 10,
    marginBottom: 4,
  },
});
