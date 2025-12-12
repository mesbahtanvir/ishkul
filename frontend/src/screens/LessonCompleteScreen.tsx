/**
 * LessonCompleteScreen - Compact summary screen after completing a lesson
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
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
  const { courseId, lessonId, sectionId, score, timeSpent, nextLesson } = route.params;
  const { colors } = useTheme();

  // Get next lesson details from store
  const course = useCoursesStore((state) => state.courses.find((c) => c.id === courseId));
  const nextLessonDetails = React.useMemo(() => {
    if (!nextLesson || !course?.outline?.sections) return null;
    const section = course.outline.sections.find((s) => s.id === nextLesson.sectionId);
    const lesson = section?.lessons?.find((l) => l.id === nextLesson.lessonId);
    return lesson ? { title: lesson.title, sectionTitle: section?.title } : null;
  }, [nextLesson, course]);

  // Build current position for sidebar highlighting
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
      navigation.navigate('Course', { courseId });
    }
  };

  const handleBackToCourse = () => {
    navigation.navigate('Course', { courseId });
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
        {/* Compact Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>{celebrationEmoji}</Text>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Lesson Complete!
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {message}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: scoreColor + '15' }]}>
            <Text style={[styles.statValue, { color: scoreColor }]}>{score}%</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Score</Text>
          </View>
          {timeSpent > 0 && (
            <View style={[styles.statPill, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{formatTime(timeSpent)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Time</Text>
            </View>
          )}
        </View>

        {/* Score Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${score}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
        </View>

        {/* Next Action Card */}
        <Card elevation="md" padding="md" style={styles.actionCard}>
          {nextLesson ? (
            <>
              <Text style={[styles.upNextLabel, { color: colors.text.secondary }]}>
                UP NEXT
              </Text>
              {nextLessonDetails ? (
                <View style={styles.nextLessonInfo}>
                  <Text style={[styles.nextLessonTitle, { color: colors.text.primary }]} numberOfLines={1}>
                    {nextLessonDetails.title}
                  </Text>
                  {nextLessonDetails.sectionTitle && (
                    <Text style={[styles.nextSectionTitle, { color: colors.text.secondary }]} numberOfLines={1}>
                      in {nextLessonDetails.sectionTitle}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.nextLessonTitle, { color: colors.text.primary }]}>
                  Continue to next lesson
                </Text>
              )}
              <Button
                title="Continue Learning →"
                onPress={handleContinue}
                style={styles.continueButton}
              />
            </>
          ) : (
            <>
              <Text style={styles.completeEmoji}>🏆</Text>
              <Text style={[styles.completeTitle, { color: colors.success }]}>
                Section Complete!
              </Text>
              <Text style={[styles.completeText, { color: colors.text.secondary }]}>
                You've finished all lessons in this section.
              </Text>
              <Button
                title="Back to Course"
                onPress={handleBackToCourse}
                style={styles.continueButton}
              />
            </>
          )}
        </Card>

        {/* Secondary Action */}
        {nextLesson && (
          <TouchableOpacity onPress={handleBackToCourse} style={styles.secondaryAction}>
            <Text style={[styles.secondaryText, { color: colors.text.secondary }]}>
              ← Back to Course Outline
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LearningLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.heading.h2,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.body.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.full,
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.body.medium,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label.small,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionCard: {
    marginBottom: Spacing.md,
  },
  upNextLabel: {
    ...Typography.label.small,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  nextLessonInfo: {
    marginBottom: Spacing.md,
  },
  nextLessonTitle: {
    ...Typography.body.large,
    fontWeight: '600',
  },
  nextSectionTitle: {
    ...Typography.body.small,
    marginTop: 2,
  },
  continueButton: {
    marginTop: Spacing.sm,
  },
  completeEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  completeTitle: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  completeText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryText: {
    ...Typography.body.medium,
  },
});

export default LessonCompleteScreen;
