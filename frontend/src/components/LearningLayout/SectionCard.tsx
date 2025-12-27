/**
 * SectionCard - Expandable section card for learning sidebar
 *
 * Shows section progress and contains expandable list of lessons.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Section, Lesson } from '../../types/app';
import { getLessonStatusIcon, getLessonStatusColor } from '../../utils/lessonStatusHelpers';

export interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isCurrentSection: boolean;
  currentLessonId: string | null;
  onLessonPress: (lesson: Lesson, sectionId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionIndex,
  isCurrentSection,
  currentLessonId,
  onLessonPress,
  expanded,
  onToggle,
  colors,
}) => {
  const completedLessons = section.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = section.lessons.length;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <View
      style={[
        styles.sectionCard,
        { borderColor: colors.border },
        isCurrentSection && {
          borderColor: colors.primary + '4D',
          backgroundColor: colors.primary + '08',
        },
      ]}
    >
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[
              styles.sectionNumber,
              {
                backgroundColor:
                  section.status === 'completed'
                    ? colors.success
                    : isCurrentSection
                      ? colors.primary
                      : colors.ios.gray,
              },
            ]}
          >
            {section.status === 'completed' ? (
              <Text style={[styles.sectionNumberText, { color: colors.white }]}>✓</Text>
            ) : (
              <Text style={[styles.sectionNumberText, { color: colors.white }]}>
                {sectionIndex + 1}
              </Text>
            )}
          </View>
          <View style={styles.sectionInfo}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {section.title}
            </Text>
            <Text style={[styles.sectionStats, { color: colors.text.secondary }]}>
              {completedLessons}/{totalLessons} lessons
              {section.estimatedMinutes > 0 && ` • ${section.estimatedMinutes} min`}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: section.status === 'completed' ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <Text style={[styles.expandIcon, { color: colors.text.secondary }]}>
          {expanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.lessonsList, { borderTopColor: colors.divider }]}>
          {section.lessons.map((lesson) => {
            const isCurrentLesson = currentLessonId === lesson.id;

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonItem,
                  { borderBottomColor: colors.divider },
                  isCurrentLesson && {
                    backgroundColor: colors.primary + '10',
                    borderLeftColor: colors.primary,
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() => onLessonPress(lesson, section.id)}
                disabled={lesson.status === 'locked'}
                activeOpacity={0.7}
              >
                <Text style={styles.lessonIcon}>{getLessonStatusIcon(lesson.status)}</Text>
                <View style={styles.lessonContent}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      {
                        color: getLessonStatusColor(lesson.status, colors),
                        opacity: lesson.status === 'locked' ? 0.5 : 1,
                      },
                      lesson.status === 'completed' && styles.completedLessonTitle,
                    ]}
                    numberOfLines={2}
                  >
                    {lesson.title}
                  </Text>
                  {lesson.estimatedMinutes > 0 && (
                    <Text style={[styles.lessonDuration, { color: colors.text.tertiary }]}>
                      {lesson.estimatedMinutes} min
                    </Text>
                  )}
                </View>
                {isCurrentLesson && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.currentBadgeText, { color: colors.white }]}>NOW</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  sectionNumberText: {
    fontWeight: '700',
    fontSize: 11,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionStats: {
    ...Typography.label.small,
    fontSize: 11,
    marginBottom: 4,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  expandIcon: {
    fontSize: 10,
    marginLeft: Spacing.xs,
  },

  // Lessons list
  lessonsList: {
    borderTopWidth: 1,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  lessonIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.label.medium,
    fontWeight: '500',
    marginBottom: 1,
  },
  completedLessonTitle: {
    textDecorationLine: 'line-through',
  },
  lessonDuration: {
    ...Typography.label.small,
    fontSize: 10,
  },
  currentBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
});
