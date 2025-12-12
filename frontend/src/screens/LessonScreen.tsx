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
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { BlockRenderer } from '../components/blocks';
import { useLesson } from '../hooks/useLesson';
import { useTheme } from '../hooks/useTheme';
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
    currentBlock,
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
    previousBlock,
    submitAnswer,
    completeCurrentBlock,
    finishLesson,
    generateBlocksIfNeeded,
    generateCurrentBlockContent,
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

  // Build current position for sidebar highlighting
  const currentPosition: LessonPosition | undefined = sectionId && lessonId ? {
    sectionId,
    lessonId,
    sectionIndex: 0, // Will be determined by sidebar
    lessonIndex: 0,
  } : undefined;

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

  // Progress percentage
  const progress = totalBlocks > 0 ? (completedBlocksCount / totalBlocks) * 100 : 0;

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
                {currentBlockIndex + 1}/{totalBlocks}
              </Text>
              {totalBlocks > 1 && totalBlocks <= 10 && (
                <View style={styles.compactDots}>
                  {lesson.blocks?.map((block, index) => (
                    <View
                      key={block.id}
                      style={[
                        styles.compactDot,
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
              )}
            </View>
          </View>
          {/* Progress bar */}
          <ProgressBar progress={progress} height={4} />
        </View>

        {/* Current Block */}
        {currentBlock ? (
          <BlockRenderer
            block={currentBlock}
            onAnswer={submitAnswer}
            onComplete={async () => {
              await completeCurrentBlock();
              nextBlock();
            }}
            onGenerateContent={generateCurrentBlockContent}
            isGenerating={isGeneratingContent === currentBlock.id}
            isActive
            showHeader
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
        ) : isGeneratingContent ? (
          <Card elevation="md" padding="lg">
            <View style={styles.generatingContentContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.generatingContentText, { color: colors.text.secondary }]}>
                Generating content...
              </Text>
            </View>
          </Card>
        ) : totalBlocks === 0 ? (
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
          <View style={styles.navButtonRight}>
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
            {/* Show generating indicator next to button when content is loading */}
            {currentBlock && currentBlock.contentStatus !== 'ready' && (
              <View style={styles.buttonLoadingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.buttonLoadingText, { color: colors.text.secondary }]}>
                  Generating...
                </Text>
              </View>
            )}
          </View>
        </View>
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
  compactDots: {
    flexDirection: 'row',
    gap: 4,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  navButtonRight: {
    flex: 1,
    alignItems: 'center',
  },
  buttonLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  buttonLoadingText: {
    ...Typography.label.small,
    marginLeft: Spacing.xs,
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
