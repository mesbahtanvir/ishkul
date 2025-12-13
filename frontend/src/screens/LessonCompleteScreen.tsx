/**
 * LessonCompleteScreen - Minimal celebration screen after completing a lesson
 *
 * Design principles:
 * - Quick celebration, not a blocker
 * - Essential info only (score, next action)
 * - Course outline visible in sidebar for context
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Button } from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import { useCoursesStore } from '../state/coursesStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { LessonPosition } from '../types/app';

type LessonCompleteScreenProps = NativeStackScreenProps<RootStackParamList, 'LessonComplete'>;

/**
 * Get celebration emoji based on score
 */
const getCelebrationEmoji = (score: number): string => {
  if (score >= 90) return '🎉';
  if (score >= 70) return '🌟';
  if (score >= 50) return '👍';
  return '💪';
};

/**
 * Get short message based on score
 */
const getMessage = (score: number): string => {
  if (score >= 90) return 'Excellent!';
  if (score >= 70) return 'Great job!';
  if (score >= 50) return 'Good effort!';
  return 'Keep going!';
};

/**
 * Format time spent
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
};

export const LessonCompleteScreen: React.FC<LessonCompleteScreenProps> = ({
  navigation,
  route,
}) => {
  const { courseId, lessonId, sectionId, score, timeSpent } = route.params;
  const { colors } = useTheme();

  // Get next lesson from store (not from URL params - objects can't serialize to URLs)
  const getNextLesson = useCoursesStore((state) => state.getNextLesson);
  const course = useCoursesStore((state) => state.courses.find((c) => c.id === courseId));

  // Compute next lesson position
  const nextLesson = useMemo(() => {
    return getNextLesson(courseId, sectionId, lessonId);
  }, [getNextLesson, courseId, sectionId, lessonId]);

  // Get next lesson title for display
  const nextLessonTitle = useMemo(() => {
    if (!nextLesson || !course?.outline?.sections) return null;
    const section = course.outline.sections.find((s) => s.id === nextLesson.sectionId);
    const lesson = section?.lessons?.find((l) => l.id === nextLesson.lessonId);
    return lesson?.title ?? null;
  }, [nextLesson, course]);

  // Build current position for sidebar highlighting (show completed lesson)
  const currentPosition: LessonPosition | undefined = sectionId && lessonId ? {
    sectionId,
    lessonId,
    sectionIndex: 0,
    lessonIndex: 0,
  } : undefined;

  const handleContinue = () => {
    if (nextLesson) {
      navigation.replace('Lesson', {
        courseId,
        lessonId: nextLesson.lessonId,
        sectionId: nextLesson.sectionId,
      });
    } else {
      // Course complete - go to course overview
      navigation.navigate('Course', { courseId });
    }
  };

  const celebrationEmoji = getCelebrationEmoji(score);
  const message = getMessage(score);
  const scoreColor = score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.danger;

  return (
    <LearningLayout
      courseId={courseId}
      currentPosition={currentPosition}
      title="Lesson Complete"
      showBackButton={false}
    >
      <View style={styles.content}>
        {/* Celebration Header - Centered, minimal */}
        <View style={styles.celebrationContainer}>
          <Text style={styles.emoji}>{celebrationEmoji}</Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {message}
          </Text>

          {/* Score Badge */}
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '15' }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}%</Text>
          </View>

          {/* Time spent (if available) */}
          {timeSpent > 0 && (
            <Text style={[styles.timeText, { color: colors.text.tertiary }]}>
              Completed in {formatTime(timeSpent)}
            </Text>
          )}
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          {nextLesson ? (
            <>
              {nextLessonTitle && (
                <Text style={[styles.upNextText, { color: colors.text.secondary }]}>
                  Next: {nextLessonTitle}
                </Text>
              )}
              <Button
                title="Continue →"
                onPress={handleContinue}
                style={styles.continueButton}
              />
            </>
          ) : (
            <>
              <Text style={[styles.courseCompleteText, { color: colors.success }]}>
                🏆 Course Complete!
              </Text>
              <Button
                title="View Course"
                onPress={handleContinue}
                variant="outline"
                style={styles.continueButton}
              />
            </>
          )}
        </View>
      </View>
    </LearningLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.full,
    marginBottom: Spacing.sm,
  },
  scoreValue: {
    ...Typography.heading.h3,
    fontWeight: '700',
  },
  timeText: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
  },
  actionSection: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  upNextText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  continueButton: {
    width: '100%',
  },
  courseCompleteText: {
    ...Typography.body.large,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});

export default LessonCompleteScreen;
