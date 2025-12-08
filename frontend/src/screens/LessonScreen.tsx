/**
 * LessonScreen - Block-based lesson experience
 *
 * Uses 3-stage generation:
 * 1. Lesson outline (from course generation)
 * 2. Block skeletons (generated when lesson starts)
 * 3. Block content (generated as user progresses)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { BlockRenderer } from '../components/blocks';
import { useLesson } from '../hooks/useLesson';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type LessonScreenProps = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export const LessonScreen: React.FC<LessonScreenProps> = ({ navigation, route }) => {
  const { courseId, lessonId, sectionId } = route.params;
  const { colors } = useTheme();
  const { responsive } = useResponsive();

  const {
    lesson,
    currentBlock,
    currentBlockIndex,
    totalBlocks,
    isLoading,
    isGeneratingBlocks,
    isGeneratingContent,
    isCompleting,
    error,
    completedBlocksCount,
    isLessonComplete,
    score,
    nextBlock,
    previousBlock,
    startBlock,
    submitAnswer,
    completeCurrentBlock,
    finishLesson,
  } = useLesson({
    courseId,
    lessonId,
    sectionId,
    autoGenerate: true,
  });

  // Handle lesson completion
  useEffect(() => {
    if (isLessonComplete && lesson) {
      // Navigate to completion screen
      finishLesson().then((nextPosition) => {
        navigation.replace('LessonComplete', {
          courseId,
          lessonId,
          sectionId,
          score,
          timeSpent: 0, // TODO: Calculate from progress
          nextLesson: nextPosition ?? undefined,
        });
      });
    }
  }, [isLessonComplete, lesson, courseId, lessonId, sectionId, score, finishLesson, navigation]);

  // Loading state
  if (isLoading) {
    return (
      <Container scrollable>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading lesson...
          </Text>
        </View>
      </Container>
    );
  }

  // Generating blocks state
  if (isGeneratingBlocks) {
    return (
      <Container scrollable>
        <View style={styles.centerContainer}>
          <Text style={styles.generatingEmoji}>🧠</Text>
          <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
            Preparing Your Lesson
          </Text>
          <Text style={[styles.generatingText, { color: colors.text.secondary }]}>
            Creating personalized content blocks...
          </Text>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.generatingLoader}
          />
        </View>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container scrollable>
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>
              Something went wrong
            </Text>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>
              {error}
            </Text>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.errorButton}
            />
          </View>
        </Card>
      </Container>
    );
  }

  // No lesson data
  if (!lesson) {
    return (
      <Container scrollable>
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📭</Text>
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
              Lesson not found
            </Text>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.errorButton}
            />
          </View>
        </Card>
      </Container>
    );
  }

  // Responsive values
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  // Progress percentage
  const progress = totalBlocks > 0 ? (completedBlocksCount / totalBlocks) * 100 : 0;

  return (
    <Container scrollable>
      <View style={styles.content}>
        {/* Lesson Header */}
        <Card elevation="sm" padding="md" style={styles.headerCard}>
          <View style={styles.header}>
            <Text style={[styles.lessonTitle, { fontSize: titleSize, color: colors.text.primary }]}>
              {lesson.title}
            </Text>
            {lesson.description && (
              <Text style={[styles.lessonDescription, { color: colors.text.secondary }]}>
                {lesson.description}
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>
                Progress
              </Text>
              <Text style={[styles.progressCount, { color: colors.text.secondary }]}>
                {completedBlocksCount}/{totalBlocks} blocks
              </Text>
            </View>
            <ProgressBar progress={progress} height={6} />
          </View>
        </Card>

        {/* Block Navigation */}
        {totalBlocks > 1 && (
          <View style={styles.blockNav}>
            <Text style={[styles.blockNavText, { color: colors.text.secondary }]}>
              Block {currentBlockIndex + 1} of {totalBlocks}
            </Text>
            <View style={styles.blockNavDots}>
              {lesson.blocks?.map((block, index) => (
                <View
                  key={block.id}
                  style={[
                    styles.navDot,
                    {
                      backgroundColor:
                        index === currentBlockIndex
                          ? colors.primary
                          : index < completedBlocksCount
                          ? colors.success
                          : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Current Block */}
        {currentBlock ? (
          <BlockRenderer
            block={currentBlock}
            onAnswer={submitAnswer}
            onComplete={async () => {
              await completeCurrentBlock();
              nextBlock();
            }}
            isActive
            showHeader
          />
        ) : isGeneratingContent ? (
          <Card elevation="md" padding="lg">
            <View style={styles.generatingContentContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.generatingContentText, { color: colors.text.secondary }]}>
                Generating content...
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          <Button
            title="Previous"
            onPress={previousBlock}
            variant="outline"
            disabled={currentBlockIndex === 0}
            style={styles.navButton}
          />
          <Button
            title={currentBlockIndex === totalBlocks - 1 ? 'Finish' : 'Next'}
            onPress={() => {
              if (currentBlockIndex === totalBlocks - 1) {
                completeCurrentBlock();
              } else {
                nextBlock();
              }
            }}
            disabled={!currentBlock || currentBlock.contentStatus !== 'ready'}
            style={styles.navButton}
          />
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body.medium,
    marginTop: Spacing.md,
  },
  generatingEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  generatingTitle: {
    ...Typography.heading.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  generatingText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  generatingLoader: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorButton: {
    minWidth: 120,
  },
  headerCard: {
    marginBottom: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.md,
  },
  lessonTitle: {
    ...Typography.heading.h2,
    marginBottom: Spacing.xs,
  },
  lessonDescription: {
    ...Typography.body.medium,
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.label.small,
  },
  progressCount: {
    ...Typography.label.small,
  },
  blockNav: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  blockNavText: {
    ...Typography.label.small,
    marginBottom: Spacing.sm,
  },
  blockNavDots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  generatingContentContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  generatingContentText: {
    ...Typography.body.medium,
    marginTop: Spacing.md,
  },
  navButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  navButton: {
    flex: 1,
  },
});

export default LessonScreen;
