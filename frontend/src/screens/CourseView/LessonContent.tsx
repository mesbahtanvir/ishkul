/**
 * LessonContent - Lesson content display
 * Shown when a lesson is active
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { ScrollableLessonBlocks } from '../../components/blocks';
import { useLesson } from '../../hooks/useLesson';
import { useTheme } from '../../hooks/useTheme';
import { useLessonStore } from '../../state/lessonStore';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Lesson, LessonPosition } from '../../types/app';

export interface LessonContentProps {
  courseId: string;
  lessonId: string;
  sectionId: string;
  initialLesson?: Lesson;
  onLessonComplete: (nextPosition: LessonPosition | null) => void;
  onBack: () => void;
}

export const LessonContent: React.FC<LessonContentProps> = ({
  courseId,
  lessonId,
  sectionId,
  initialLesson,
  onLessonComplete,
  onBack,
}) => {
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
    initialLesson,
  });

  // Handle lesson completion
  useEffect(() => {
    if (isLessonComplete && lesson) {
      finishLesson().then((nextPosition) => {
        onLessonComplete(nextPosition);
      });
    }
  }, [isLessonComplete, lesson, finishLesson, onLessonComplete]);

  // Progress percentage
  const progress = totalBlocks > 0 ? (completedBlocksCount / totalBlocks) * 100 : 0;

  // Get completed block IDs from local progress
  const { localProgress } = useLessonStore();
  const completedBlockIds = localProgress?.completedBlocks ?? [];

  // Handle block answer submission
  const handleBlockAnswer = useCallback(
    (_blockId: string, answer: string | string[]) => {
      submitAnswer(answer);
    },
    [submitAnswer]
  );

  // Handle block completion
  const handleBlockComplete = useCallback(async () => {
    await completeCurrentBlock();
  }, [completeCurrentBlock]);

  // Handle content generation for a specific block
  const handleGenerateContent = useCallback(
    async (blockId: string) => {
      const { generateBlockContent } = useLessonStore.getState();
      await generateBlockContent(courseId, sectionId, lessonId, blockId);
    },
    [courseId, sectionId, lessonId]
  );

  // Handle continue/next block
  const handleContinue = useCallback(() => {
    nextBlock();
  }, [nextBlock]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading lesson...
        </Text>
      </View>
    );
  }

  // Generating blocks state
  if (isGeneratingBlocks) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.generatingEmoji}>🧠</Text>
        <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
          Preparing Your Lesson
        </Text>
        <Text style={[styles.generatingText, { color: colors.text.secondary }]}>
          Creating personalized content blocks...
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.generatingLoader} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <Card elevation="md" padding="lg">
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.danger }]}>Something went wrong</Text>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
          <Button title="Go Back" onPress={onBack} variant="outline" style={styles.errorButton} />
        </View>
      </Card>
    );
  }

  // No lesson data
  if (!lesson) {
    return (
      <Card elevation="md" padding="lg">
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📭</Text>
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Lesson not found</Text>
          <Button title="Go Back" onPress={onBack} variant="outline" style={styles.errorButton} />
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.lessonContent}>
      {/* Compact Lesson Header */}
      <View style={[styles.compactHeader, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.compactTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {lesson.title}
          </Text>
          <View style={styles.headerRight}>
            <Text style={[styles.blockCounter, { color: colors.text.secondary }]}>
              {completedBlocksCount}/{totalBlocks}
            </Text>
          </View>
        </View>
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
      ) : lesson?.blocksStatus === 'generating' || isGeneratingBlocks ? (
        <Card elevation="md" padding="lg">
          <View style={styles.emptyBlockContainer}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.generatingLoader} />
            <Text style={[styles.emptyBlockTitle, { color: colors.text.primary }]}>
              Generating Content
            </Text>
            <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
              Creating personalized lesson blocks for you...
            </Text>
          </View>
        </Card>
      ) : lesson?.blocksStatus === 'pending' ? (
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
        <Card elevation="md" padding="lg">
          <View style={styles.emptyBlockContainer}>
            <Text style={styles.emptyBlockIcon}>⚠️</Text>
            <Text style={[styles.emptyBlockTitle, { color: colors.danger }]}>
              Failed to Load Content
            </Text>
            <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
              {error || 'Something went wrong while preparing the lesson.'}
            </Text>
            <Button title="Try Again" onPress={generateBlocksIfNeeded} style={styles.generateButton} />
          </View>
        </Card>
      ) : (
        <Card elevation="md" padding="lg">
          <View style={styles.emptyBlockContainer}>
            <Text style={styles.emptyBlockIcon}>📭</Text>
            <Text style={[styles.emptyBlockTitle, { color: colors.text.primary }]}>
              No Content Available
            </Text>
            <Text style={[styles.emptyBlockText, { color: colors.text.secondary }]}>
              This lesson doesn't have any content blocks yet.
            </Text>
            <Button title="Go Back" onPress={onBack} variant="outline" style={styles.generateButton} />
          </View>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lessonContent: {
    flex: 1,
    gap: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },

  // Loading
  loadingText: {
    ...Typography.body.medium,
    marginTop: Spacing.md,
  },

  // Generating - lesson level
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

  // Error
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

  // Lesson Header
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
  backButton: {
    paddingRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '600',
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

  // Empty block states
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
