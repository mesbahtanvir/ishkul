/**
 * LessonCompleteScreen - Summary screen after completing a lesson
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

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
 * Get message based on score
 */
const getMessage = (score: number): string => {
  if (score >= 90) return 'Excellent work!';
  if (score >= 70) return 'Great job!';
  if (score >= 50) return 'Good effort!';
  return 'Keep practicing!';
};

/**
 * Format time spent
 */
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
};

export const LessonCompleteScreen: React.FC<LessonCompleteScreenProps> = ({
  navigation,
  route,
}) => {
  const { courseId, lessonId, sectionId, score, timeSpent, nextLesson } = route.params;
  const { colors } = useTheme();
  const { responsive } = useResponsive();

  const handleContinue = () => {
    if (nextLesson) {
      navigation.replace('Lesson', {
        courseId,
        lessonId: nextLesson.lessonId,
        sectionId: nextLesson.sectionId,
      });
    } else {
      // Course complete - go back to course view
      navigation.navigate('Course', { courseId });
    }
  };

  const handleBackToCourse = () => {
    navigation.navigate('Course', { courseId });
  };

  // Responsive values
  const emojiSize = responsive(72, 96, 120);
  const titleSize = responsive(
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize,
    40
  );

  const celebrationEmoji = getCelebrationEmoji(score);
  const message = getMessage(score);

  return (
    <Container scrollable>
      <View style={styles.content}>
        {/* Celebration Card */}
        <Card elevation="lg" padding="xl" style={styles.mainCard}>
          <View style={styles.celebration}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>
              {celebrationEmoji}
            </Text>
            <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
              Lesson Complete!
            </Text>
            <Text style={[styles.message, { color: colors.text.secondary }]}>
              {message}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {score}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                Score
              </Text>
            </View>
            {timeSpent > 0 && (
              <View style={[styles.statCard, { backgroundColor: colors.success + '10' }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatTime(timeSpent)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                  Time
                </Text>
              </View>
            )}
          </View>

          {/* Score Bar */}
          <View style={styles.scoreBarContainer}>
            <View style={[styles.scoreBarTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${score}%`,
                    backgroundColor:
                      score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.danger,
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Next Lesson Card */}
        {nextLesson && (
          <Card elevation="md" padding="lg" style={styles.nextCard}>
            <View style={styles.nextContent}>
              <Text style={[styles.nextLabel, { color: colors.text.secondary }]}>
                Up Next
              </Text>
              <Text style={[styles.nextEmoji]}>➡️</Text>
              <Text style={[styles.nextText, { color: colors.text.primary }]}>
                Continue to the next lesson
              </Text>
            </View>
          </Card>
        )}

        {/* Course Complete */}
        {!nextLesson && (
          <Card elevation="md" padding="lg" style={styles.nextCard}>
            <View style={styles.nextContent}>
              <Text style={[styles.nextEmoji]}>🏆</Text>
              <Text style={[styles.nextLabel, { color: colors.success }]}>
                Section Complete!
              </Text>
              <Text style={[styles.nextText, { color: colors.text.secondary }]}>
                You've finished all lessons in this section.
              </Text>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <Button
            title={nextLesson ? 'Continue Learning' : 'Back to Course'}
            onPress={handleContinue}
            style={styles.primaryButton}
          />
          {nextLesson && (
            <Button
              title="Back to Course"
              onPress={handleBackToCourse}
              variant="outline"
              style={styles.secondaryButton}
            />
          )}
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  mainCard: {
    alignItems: 'center',
  },
  celebration: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading.h1,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body.large,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.heading.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label.small,
    marginTop: Spacing.xs,
  },
  scoreBarContainer: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  scoreBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  nextCard: {
    marginTop: Spacing.sm,
  },
  nextContent: {
    alignItems: 'center',
  },
  nextLabel: {
    ...Typography.label.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  nextEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  nextText: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  buttons: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    // Full width by default
  },
  secondaryButton: {
    // Full width by default
  },
});

export default LessonCompleteScreen;
