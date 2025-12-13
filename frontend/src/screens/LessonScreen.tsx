/**
 * LessonScreen - Block-based lesson experience
 *
 * Uses scrollable stacked cards design:
 * - All blocks visible in scrollable list
 * - Completed blocks show checkmark, slightly faded
 * - Active block highlighted with border/shadow
 * - Upcoming blocks dimmed/locked
 * - Auto-scroll to active block on navigation
 *
 * Uses 3-stage generation:
 * 1. Lesson outline (from course generation)
 * 2. Block skeletons (generated when lesson starts)
 * 3. Block content (generated as user progresses)
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { ScrollableLessonBlocks } from '../components/blocks';
import { useLesson } from '../hooks/useLesson';
import { useTheme } from '../hooks/useTheme';
import { useLessonStore } from '../state/lessonStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { LessonPosition } from '../types/app';

type LessonScreenProps = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export const LessonScreen: React.FC<LessonScreenProps> = ({ navigation, route }) => {
  const { courseId, lessonId, sectionId, lesson: initialLessonFromNav } = route.params;
  const { colors } = useTheme();

  const {
    lesson,
    currentBlockIndex,
    totalBlocks,
    isLoading,
    isGeneratingBlocks,
    isGeneratingContent,
    error,
    completedBlocksCount,
    isLessonComplete,
    score,
    nextBlock,
    submitAnswer,
    completeCurrentBlock,
    finishLesson,
    generateBlocksIfNeeded,
  } = useLesson({
    courseId,
    lessonId,
    sectionId,
    autoGenerate: true,
    initialLesson: initialLessonFromNav,
  });

  // Handle lesson completion
  useEffect(() => {
    if (isLessonComplete && lesson) {
      // Navigate to completion screen
      // Note: nextLesson is computed from store in LessonCompleteScreen (objects can't serialize to URLs)
      finishLesson().then(() => {
        navigation.replace('LessonComplete', {
          courseId,
          lessonId,
          sectionId,
          score,
          timeSpent: 0, // TODO: Calculate from progress
        });
      });
    }
  }, [isLessonComplete, lesson, courseId, lessonId, sectionId, score, finishLesson, navigation]);

  // Build current position for sidebar highlighting
  const currentPosition: LessonPosition | undefined = sectionId && lessonId ? {
    sectionId,
    lessonId,
    sectionIndex: 0, // Will be determined by sidebar
    lessonIndex: 0,
  } : undefined;

  // Progress percentage (moved before conditional returns to comply with Rules of Hooks)
  const progress = totalBlocks > 0 ? (completedBlocksCount / totalBlocks) * 100 : 0;

  // Get completed block IDs from local progress (moved before conditional returns)
  const { localProgress } = useLessonStore();
  const completedBlockIds = localProgress?.completedBlocks ?? [];

  // Handle block answer submission (moved before conditional returns)
  const handleBlockAnswer = useCallback(
    (_blockId: string, answer: string | string[]) => {
      submitAnswer(answer);
    },
    [submitAnswer]
  );

  // Handle block completion (moved before conditional returns)
  const handleBlockComplete = useCallback(
    async () => {
      await completeCurrentBlock();
    },
    [completeCurrentBlock]
  );

  // Handle content generation for a specific block (moved before conditional returns)
  const handleGenerateContent = useCallback(
    async (blockId: string) => {
      const { generateBlockContent } = useLessonStore.getState();
      await generateBlockContent(courseId, sectionId, lessonId, blockId);
    },
    [courseId, sectionId, lessonId]
  );

  // Handle continue/next block (moved before conditional returns)
  const handleContinue = useCallback(() => {
    nextBlock();
  }, [nextBlock]);

  // Loading state
  if (isLoading) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title="Loading..."
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading lesson...
          </Text>
        </View>
      </LearningLayout>
    );
  }

  // Generating blocks state - show sidebar to maintain context
  if (isGeneratingBlocks) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title="Preparing Lesson"
      >
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
      </LearningLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title="Error"
      >
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
      </LearningLayout>
    );
  }

  // No lesson data
  if (!lesson) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title="Not Found"
      >
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
      </LearningLayout>
    );
  }

  return (
    <LearningLayout
      courseId={courseId}
      currentPosition={currentPosition}
      title={lesson.title}
      showBackButton={false}
    >
      <View style={styles.content}>
        {/* Compact Lesson Header */}
        <View style={[styles.compactHeader, { backgroundColor: colors.background.secondary }]}>
          {/* Top row: Title + Block counter + Dots */}
          <View style={styles.headerTopRow}>
            <Text
              style={[styles.compactTitle, { color: colors.text.primary }]}
              numberOfLines={1}
            >
              {lesson.title}
            </Text>
            <View style={styles.headerRight}>
              <Text style={[styles.blockCounter, { color: colors.text.secondary }]}>
                {completedBlocksCount}/{totalBlocks} completed
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <ProgressBar progress={progress} height={4} />
        </View>

        {/* Scrollable Lesson Blocks */}
        {lesson?.blocks && lesson.blocks.length > 0 ? (
          <ScrollableLessonBlocks
            blocks={lesson.blocks}
            currentBlockIndex={currentBlockIndex}
            completedBlockIds={completedBlockIds}
            onBlockAnswer={handleBlockAnswer}
            onBlockComplete={handleBlockComplete}
            onGenerateContent={handleGenerateContent}
            generatingBlockId={isGeneratingContent}
            onContinue={handleContinue}
          />
        ) : lesson?.blocksStatus === 'pending' ? (
          // Blocks haven't been generated yet - show prompt to generate
          <Card elevation="md" padding="lg">
            <View style={styles.emptyBlockContainer}>
              <Text style={styles.emptyBlockIcon}>📦</Text>
              <Text style={[styles.emptyBlockTitle, { color: colors.text.primary }]}>
                Preparing Lesson Content
              </Text>
              <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
                Content blocks are being prepared for this lesson.
              </Text>
              <Button
                title="Generate Content"
                onPress={generateBlocksIfNeeded}
                style={styles.generateButton}
              />
            </View>
          </Card>
        ) : lesson?.blocksStatus === 'error' ? (
          // Block generation failed - show error with retry
          <Card elevation="md" padding="lg">
            <View style={styles.emptyBlockContainer}>
              <Text style={styles.emptyBlockIcon}>⚠️</Text>
              <Text style={[styles.emptyBlockTitle, { color: colors.danger }]}>
                Failed to Load Content
              </Text>
              <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
                {error || 'Something went wrong while preparing the lesson.'}
              </Text>
              <Button
                title="Try Again"
                onPress={generateBlocksIfNeeded}
                style={styles.generateButton}
              />
            </View>
          </Card>
        ) : (
          // No blocks at all - unusual state
          <Card elevation="md" padding="lg">
            <View style={styles.emptyBlockContainer}>
              <Text style={styles.emptyBlockIcon}>📭</Text>
              <Text style={[styles.emptyBlockTitle, { color: colors.text.primary }]}>
                No Content Available
              </Text>
              <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
                This lesson doesn't have any content blocks yet.
              </Text>
              <Button
                title="Go Back"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.generateButton}
              />
            </View>
          </Card>
        )}
      </View>
    </LearningLayout>
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
  compactHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  compactTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  blockCounter: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  emptyBlockContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyBlockIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyBlockTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyBlockText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  generateButton: {
    minWidth: 160,
  },
});

export default LessonScreen;
