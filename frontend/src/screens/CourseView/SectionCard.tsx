/**
 * SectionCard - Section expansion card for course overview
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Section, Lesson } from '../../types/app';
import { getLessonStatusIcon, getLessonStatusColor } from '../../utils/lessonStatusHelpers';

export interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onLessonPress: (lesson: Lesson) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionIndex,
  isExpanded,
  onToggle,
  onLessonPress,
}) => {
  const { colors } = useTheme();

  const completedLessons = section.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = section.lessons.length;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <Card elevation="md" padding="md" style={styles.sectionCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionInfo}>
            <Text style={[styles.sectionNumber, { color: colors.primary }]}>
              Section {sectionIndex + 1}
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionProgress, { color: colors.text.secondary }]}>
              {completedLessons}/{totalLessons} lessons completed
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>
        <ProgressBar progress={progress} height={4} style={styles.sectionProgressBar} />
      </TouchableOpacity>

      {/* Lessons List */}
      {isExpanded && (
        <View style={styles.lessonsContainer}>
          {section.lessons.map((lesson, lessonIndex) => (
            <TouchableOpacity
              key={lesson.id}
              style={[
                styles.lessonRow,
                { borderTopColor: colors.border },
                lessonIndex === 0 && styles.firstLessonRow,
              ]}
              onPress={() => onLessonPress(lesson)}
              disabled={lesson.status === 'locked'}
              activeOpacity={0.7}
            >
              <Text style={styles.lessonIcon}>{getLessonStatusIcon(lesson.status)}</Text>
              <View style={styles.lessonInfo}>
                <Text
                  style={[
                    styles.lessonTitle,
                    {
                      color: getLessonStatusColor(lesson.status, colors),
                      opacity: lesson.status === 'locked' ? 0.5 : 1,
                    },
                  ]}
                >
                  {lesson.title}
                </Text>
                {lesson.description && (
                  <Text
                    style={[styles.lessonDescription, { color: colors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {lesson.description}
                  </Text>
                )}
              </View>
              {lesson.status !== 'locked' && (
                <Text style={[styles.lessonArrow, { color: colors.text.secondary }]}>→</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionNumber: {
    ...Typography.label.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.xs,
  },
  sectionProgress: {
    ...Typography.body.small,
  },
  expandIcon: {
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  sectionProgressBar: {
    marginTop: Spacing.md,
  },

  // Lessons
  lessonsContainer: {
    marginTop: Spacing.md,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  firstLessonRow: {},
  lessonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  lessonDescription: {
    ...Typography.body.small,
    marginTop: Spacing.xs / 2,
  },
  lessonArrow: {
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
});
