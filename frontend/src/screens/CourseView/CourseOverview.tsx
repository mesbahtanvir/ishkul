/**
 * CourseOverview - Course overview with sections
 * Shown when no lesson is active
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Course, Lesson, getCourseTitle } from '../../types/app';
import { SectionCard } from './SectionCard';

export interface CourseOverviewProps {
  course: Course;
  onLessonSelect: (lesson: Lesson, sectionId: string) => void;
  onContinue: () => void;
}

export const CourseOverview: React.FC<CourseOverviewProps> = ({
  course,
  onLessonSelect,
  onContinue,
}) => {
  const { colors } = useTheme();
  const { responsive } = useResponsive();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Expand first section by default
    if (course.outline?.sections && course.outline.sections.length > 0) {
      return new Set([course.outline.sections[0].id]);
    }
    return new Set();
  });

  const sections = course.outline?.sections || [];
  const allLessons = sections.flatMap((s) => s.lessons);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  return (
    <View style={styles.overviewContent}>
      {/* Course Header */}
      <Card elevation="md" padding="lg" style={styles.headerCard}>
        <Text style={styles.courseEmoji}>{course.emoji || '📚'}</Text>
        <Text style={[styles.courseTitle, { fontSize: titleSize, color: colors.text.primary }]}>
          {getCourseTitle(course)}
        </Text>

        {/* Overall Progress */}
        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>
              Course Progress
            </Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {Math.round(overallProgress)}%
            </Text>
          </View>
          <ProgressBar progress={overallProgress} height={8} />
          <Text style={[styles.progressDetail, { color: colors.text.secondary }]}>
            {completedLessons} of {totalLessons} lessons completed
          </Text>
        </View>

        {/* Continue Button */}
        <Button
          title={completedLessons === 0 ? 'Start Learning' : 'Continue Learning'}
          onPress={onContinue}
          style={styles.continueButton}
        />
      </Card>

      {/* Sections */}
      <View style={styles.sectionsContainer}>
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            sectionIndex={index}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onLessonPress={(lesson) => onLessonSelect(lesson, section.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overviewContent: {
    flex: 1,
    gap: Spacing.md,
  },

  // Course Header
  headerCard: {
    alignItems: 'center',
  },
  courseEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  courseTitle: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  overallProgress: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.label.small,
  },
  progressValue: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  progressDetail: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.sm,
    minWidth: 200,
  },

  // Sections
  sectionsContainer: {
    gap: Spacing.md,
  },
});
