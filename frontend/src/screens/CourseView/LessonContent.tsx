/**
 * LessonContent - Lesson content display
 * Shown when a lesson is active
 *
 * Clean, immersive design with:
 * - Minimal header with dot progress indicator
 * - Full-width content area
 * - Smooth transitions between blocks
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
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
  /** When true, outline is still being generated - show placeholder state */
  isOutlineGenerating?: boolean;
  /** Course title to display when outline is generating */
  courseTitle?: string;
}

export const LessonContent: React.FC<LessonContentProps> = ({
  courseId,
  lessonId,
  sectionId,
  initialLesson,
  onLessonComplete,
  onBack,
  isOutlineGenerating = false,
  courseTitle,
}) => {
  const { colors } = useTheme();

  // If outline is still generating, show a placeholder generating state
  // This maintains the lesson content layout structure with a generating message
  if (isOutlineGenerating) {
    return (
      <View style={styles.lessonContent}>
        {/* Clean Minimal Header - placeholder version */}
        <View style={styles.cleanHeader}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.lessonTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {courseTitle || 'Creating Your Course'}
            </Text>
          </View>
        </View>

        {/* Generating content placeholder */}
        <View style={styles.generatingOutlineContainer}>
          <Text style={styles.generatingEmoji}>🧠</Text>
          <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
            Designing Your Learning Path
          </Text>
          <Text style={[styles.generatingText, { color: colors.text.secondary }]}>
            Creating personalized course outline...
          </Text>
          <View style={styles.generatingDotsRow}>
            <View style={[styles.generatingDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.generatingDot, styles.generatingDotDelay1, { backgroundColor: colors.primary }]} />
            <View style={[styles.generatingDot, styles.generatingDotDelay2, { backgroundColor: colors.primary }]} />
          </View>
        </View>
      </View>
    );
  }

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

  // Progress - used for dot indicator
  const progressDots = Array.from({ length: totalBlocks }, (_, i) => i < completedBlocksCount);

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

  // Generating blocks state - show lesson layout with blurred content area
  // This maintains the SPA feel with sidebar showing real outline while main content is blurred
  if (isGeneratingBlocks) {
    return (
      <View style={styles.lessonContent}>
        {/* Clean Minimal Header - shows lesson title */}
        <View style={styles.cleanHeader}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[styles.backArrow, { color: colors.text.secondary }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.lessonTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {lesson?.title || 'Loading...'}
            </Text>
          </View>
          {/* Skeleton progress row */}
          <View style={styles.progressRow}>
            <View style={styles.dotProgress}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[styles.dot, { backgroundColor: colors.border }]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Blurred content area with generating message */}
        <View style={styles.blocksGeneratingContainer}>
          {/* Skeleton content blocks */}
          <View style={styles.skeletonBlocks}>
            <View style={[styles.skeletonBlock, { backgroundColor: colors.border, opacity: 0.6 }]} />
            <View style={[styles.skeletonBlock, { backgroundColor: colors.border, opacity: 0.4 }]} />
            <View style={[styles.skeletonBlock, { backgroundColor: colors.border, opacity: 0.2 }]} />
          </View>

          {/* Blur overlay with generating message */}
          <View style={styles.blurOverlay}>
            <View style={[styles.generatingCard, { backgroundColor: colors.background.primary }]}>
              <Text style={styles.generatingEmoji}>🧠</Text>
              <Text style={[styles.generatingTitle, { color: colors.text.primary }]}>
                Preparing Your Lesson
              </Text>
              <Text style={[styles.generatingText, { color: colors.text.secondary }]}>
                Creating personalized content blocks...
              </Text>
              <ActivityIndicator size="large" color={colors.primary} style={styles.generatingLoader} />
            </View>
          </View>
        </View>
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
      {/* Clean Minimal Header */}
      <View style={styles.cleanHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backArrow, { color: colors.text.secondary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.lessonTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {lesson.title}
          </Text>
        </View>
        <View style={styles.progressRow}>
          {/* Dot Progress Indicator */}
          <View style={styles.dotProgress}>
            {progressDots.map((isCompleted, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  isCompleted
                    ? { backgroundColor: colors.primary }
                    : index === completedBlocksCount
                    ? { backgroundColor: colors.primary, opacity: 0.4 }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.blockCounter, { color: colors.text.tertiary }]}>
            {completedBlocksCount} of {totalBlocks}
          </Text>
        </View>
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

  // Generating outline state - when course outline is being created
  generatingOutlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  generatingDotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  generatingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  generatingDotDelay1: {
    opacity: 0.4,
  },
  generatingDotDelay2: {
    opacity: 0.2,
  },

  // Blocks generating state - blurred content area
  blocksGeneratingContainer: {
    flex: 1,
    position: 'relative',
  },
  skeletonBlocks: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skeletonBlock: {
    height: 120,
    borderRadius: Spacing.borderRadius.md,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingCard: {
    padding: Spacing.xl,
    borderRadius: Spacing.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 320,
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

  // Clean Header
  cleanHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  backArrow: {
    fontSize: 18,
    fontWeight: '400',
  },
  lessonTitle: {
    ...Typography.heading.h3,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  blockCounter: {
    ...Typography.label.small,
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
