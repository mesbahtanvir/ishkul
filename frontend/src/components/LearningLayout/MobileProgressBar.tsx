/**
 * MobileProgressBar - Tappable progress bar for mobile
 *
 * Shows current lesson and progress, tapping opens the course outline drawer.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Course, LessonPosition } from '../../types/app';

export interface MobileProgressBarProps {
  course: Course;
  currentPosition?: LessonPosition | null;
  onPress: () => void;
}

export const MobileProgressBar: React.FC<MobileProgressBarProps> = ({
  course,
  currentPosition,
  onPress,
}) => {
  const { colors } = useTheme();

  const sections = course.outline?.sections || [];
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.status === 'completed').length,
    0
  );
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Get current lesson title
  let currentLessonTitle = '';
  if (currentPosition && course.outline?.sections) {
    const section = course.outline.sections.find((s) => s.id === currentPosition.sectionId);
    const lesson = section?.lessons.find((l) => l.id === currentPosition.lessonId);
    if (lesson) {
      currentLessonTitle = lesson.title;
    }
  }

  return (
    <TouchableOpacity
      style={[styles.mobileProgressBar, { backgroundColor: colors.background.secondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mobileProgressContent}>
        <View style={styles.mobileProgressInfo}>
          <View style={styles.mobileProgressTextRow}>
            <Text style={[styles.mobileProgressLabel, { color: colors.text.secondary }]} numberOfLines={1}>
              {currentLessonTitle ? (
                <>
                  <Text style={[styles.mobileCurrentLabel, { color: colors.primary }]}>Now: </Text>
                  <Text style={{ color: colors.text.primary }}>
                    {currentLessonTitle}
                  </Text>
                </>
              ) : (
                `${completedLessons} of ${totalLessons} lessons`
              )}
            </Text>
            <Text style={[styles.mobileProgressPercent, { color: colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
          <View style={[styles.mobileProgressBarTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.mobileProgressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.mobileTapIndicator}>
          <Text style={[styles.mobileTapIcon, { color: colors.text.tertiary }]}>📋</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  mobileCurrentLabel: {
    fontWeight: '600',
  },
  mobileProgressPercent: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  mobileProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mobileProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  mobileTapIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileTapIcon: {
    fontSize: 18,
  },
});
