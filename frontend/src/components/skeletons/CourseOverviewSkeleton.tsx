/**
 * CourseOverviewSkeleton - Skeleton loading state for CourseOverview
 * Matches the exact layout of the course overview for seamless transition
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../Card';
import { Skeleton, SkeletonCircle } from '../Skeleton';
import { SkeletonTitle } from '../SkeletonText';
import { Spacing } from '../../theme/spacing';

interface CourseOverviewSkeletonProps {
  /** Number of section cards to show (default: 3) */
  sectionCount?: number;
}

/**
 * SectionCardSkeleton - Skeleton for a single section card
 */
const SectionCardSkeleton: React.FC = () => {
  return (
    <Card elevation="md" padding="md">
      <View style={styles.sectionHeader}>
        <View style={styles.sectionInfo}>
          {/* Section number placeholder (e.g., "SECTION 1") */}
          <Skeleton
            width={80}
            height={12}
            borderRadius="xs"
            style={styles.sectionNumber}
          />
          {/* Section title placeholder */}
          <SkeletonTitle size="medium" width="85%" style={styles.sectionTitle} />
          {/* Progress text placeholder (e.g., "0/5 lessons completed") */}
          <Skeleton
            width={140}
            height={14}
            borderRadius="xs"
          />
        </View>
        {/* Expand icon placeholder */}
        <Skeleton width={16} height={16} borderRadius="xs" />
      </View>
      {/* Section progress bar */}
      <Skeleton
        width="100%"
        height={4}
        borderRadius="sm"
        style={styles.sectionProgressBar}
      />
    </Card>
  );
};

export const CourseOverviewSkeleton: React.FC<CourseOverviewSkeletonProps> = ({
  sectionCount = 3,
}) => {
  return (
    <View style={styles.container}>
      {/* Course Header Card */}
      <Card elevation="md" padding="lg" style={styles.headerCard}>
        {/* Emoji placeholder */}
        <SkeletonCircle size={48} style={styles.emoji} />

        {/* Course title placeholder */}
        <SkeletonTitle size="large" width="70%" style={styles.courseTitle} />

        {/* Overall Progress Section */}
        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            {/* "Course Progress" label */}
            <Skeleton width={100} height={12} borderRadius="xs" />
            {/* Percentage value */}
            <Skeleton width={35} height={14} borderRadius="xs" />
          </View>
          {/* Progress bar */}
          <Skeleton
            width="100%"
            height={8}
            borderRadius="sm"
            style={styles.progressBar}
          />
          {/* Progress detail text (e.g., "0 of 15 lessons completed") */}
          <Skeleton
            width={160}
            height={14}
            borderRadius="xs"
            style={styles.progressDetail}
          />
        </View>

        {/* Continue button placeholder */}
        <Skeleton
          width={200}
          height={44}
          borderRadius="lg"
          style={styles.continueButton}
        />
      </Card>

      {/* Section Cards */}
      <View style={styles.sectionsContainer}>
        {Array.from({ length: sectionCount }).map((_, index) => (
          <SectionCardSkeleton key={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },

  // Header Card
  headerCard: {
    alignItems: 'center',
  },
  emoji: {
    marginBottom: Spacing.sm,
  },
  courseTitle: {
    marginBottom: Spacing.md,
  },

  // Progress Section
  overallProgress: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    marginBottom: Spacing.xs,
  },
  progressDetail: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
  },
  continueButton: {
    marginTop: Spacing.sm,
  },

  // Sections
  sectionsContainer: {
    gap: Spacing.md,
  },

  // Section Card
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionNumber: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionProgressBar: {
    marginTop: Spacing.md,
  },
});

export default CourseOverviewSkeleton;
