/**
 * CourseViewScreen - Unified SPA-like course experience
 *
 * Combines CourseOutlineScreen and LessonScreen into a single view:
 * - Sidebar always shows course outline (web) or progress bar (mobile)
 * - Main content area shows either:
 *   - Course overview (when no lesson is active)
 *   - Lesson content (when a lesson is selected)
 *
 * This eliminates page transitions within a course for seamless learning.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { ScrollableLessonBlocks } from '../components/blocks';
import { useLesson } from '../hooks/useLesson';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { useCoursesStore } from '../state/coursesStore';
import { useLessonStore } from '../state/lessonStore';
import { coursesApi } from '../services/api';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import {
  Course,
  Lesson,
  Section,
  LessonPosition,
  LessonStatus,
  OutlineStatuses,
  getCourseTitle,
} from '../types/app';

// Progress messages for generating state (rotate every 3s)
const GENERATING_MESSAGES = [
  'Analyzing your learning goal...',
  'Designing personalized curriculum...',
  'Structuring course modules...',
  'Creating topic breakdowns...',
  'Optimizing learning sequence...',
  'Almost ready...',
];

type CourseViewScreenProps = NativeStackScreenProps<RootStackParamList, 'CourseView'>;

/**
 * Get status icon for lesson
 */
const getLessonStatusIcon = (status: LessonStatus): string => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '📖';
    case 'locked':
      return '🔒';
    default:
      return '⭕';
  }
};

/**
 * Get status color for lesson
 */
const getLessonStatusColor = (
  status: LessonStatus,
  colors: ReturnType<typeof useTheme>['colors']
): string => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in_progress':
      return colors.primary;
    case 'locked':
      return colors.text.secondary;
    default:
      return colors.text.primary;
  }
};

/**
 * Generating Content - shown while course outline is being generated
 */
interface GeneratingContentProps {
  courseTitle?: string;
}

const GeneratingContent: React.FC<GeneratingContentProps> = ({ courseTitle }) => {
  const { colors } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % GENERATING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.generatingContainer}>
      <View style={styles.generatingContent}>
        <Text style={[styles.generatingMessage, { color: colors.text.primary }]}>
          {GENERATING_MESSAGES[messageIndex]}
        </Text>
        <View style={styles.generatingDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay1, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, styles.dotDelay2, { backgroundColor: colors.primary }]} />
        </View>
        {courseTitle && (
          <Text style={[styles.generatingCourseTitle, { color: colors.text.secondary }]}>
            {courseTitle}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Course Overview Content - shown when no lesson is active
 */
interface CourseOverviewProps {
  course: Course;
  onLessonSelect: (lesson: Lesson, sectionId: string) => void;
  onContinue: () => void;
}

const CourseOverview: React.FC<CourseOverviewProps> = ({
  course,
  onLessonSelect,
  onContinue,
}) => {
  const { colors } = useTheme();
  const { responsive } = useResponsive();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Expand first section by default
    if (course.outline?.sections && course.outline.sections.length > 0) {
      return new Set([course.outline.sections[0].id]);
    }
    return new Set();
  });

  const sections = course.outline?.sections || [];
  const allLessons = sections.flatMap((s) => s.lessons);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  return (
    <View style={styles.overviewContent}>
      {/* Course Header */}
      <Card elevation="md" padding="lg" style={styles.headerCard}>
        <Text style={styles.courseEmoji}>{course.emoji || '📚'}</Text>
        <Text style={[styles.courseTitle, { fontSize: titleSize, color: colors.text.primary }]}>
          {getCourseTitle(course)}
        </Text>

        {/* Overall Progress */}
        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>
              Course Progress
            </Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {Math.round(overallProgress)}%
            </Text>
          </View>
          <ProgressBar progress={overallProgress} height={8} />
          <Text style={[styles.progressDetail, { color: colors.text.secondary }]}>
            {completedLessons} of {totalLessons} lessons completed
          </Text>
        </View>

        {/* Continue Button */}
        <Button
          title={completedLessons === 0 ? 'Start Learning' : 'Continue Learning'}
          onPress={onContinue}
          style={styles.continueButton}
        />
      </Card>

      {/* Sections */}
      <View style={styles.sectionsContainer}>
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            sectionIndex={index}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onLessonPress={(lesson) => onLessonSelect(lesson, section.id)}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Section card component for overview
 */
interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onLessonPress: (lesson: Lesson) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
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

/**
 * Lesson Content - shown when a lesson is active
 */
interface LessonContentProps {
  courseId: string;
  lessonId: string;
  sectionId: string;
  initialLesson?: Lesson;
  onLessonComplete: (nextPosition: LessonPosition | null) => void;
  onBack: () => void;
}

const LessonContent: React.FC<LessonContentProps> = ({
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

// Polling interval for generating state (2 seconds)
const POLLING_INTERVAL = 2000;

/**
 * Main CourseViewScreen component
 */
export const CourseViewScreen: React.FC<CourseViewScreenProps> = ({ navigation, route }) => {
  const { courseId, lessonId: initialLessonId, sectionId: initialSectionId } = route.params;
  const { colors } = useTheme();
  const { activeCourse, setActiveCourse } = useCoursesStore();

  // Track active lesson within this screen (SPA-like behavior)
  const [activeLesson, setActiveLesson] = useState<{
    lessonId: string;
    sectionId: string;
    lesson?: Lesson;
  } | null>(
    initialLessonId && initialSectionId
      ? { lessonId: initialLessonId, sectionId: initialSectionId }
      : null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if course is in generating state
  const isGenerating =
    activeCourse?.id === courseId &&
    activeCourse.outlineStatus !== OutlineStatuses.READY &&
    activeCourse.outlineStatus !== OutlineStatuses.FAILED;

  // Load course and poll if generating
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const loadCourse = async () => {
      // Skip initial loading if we already have this course loaded
      if (activeCourse?.id === courseId && activeCourse.outline) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const course = await coursesApi.getCourse(courseId);
        if (course) {
          setActiveCourse(course);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    const pollCourse = async () => {
      try {
        const course = await coursesApi.getCourse(courseId);
        if (course) {
          setActiveCourse(course);
          // Stop polling when ready or failed
          if (
            course.outlineStatus === OutlineStatuses.READY ||
            course.outlineStatus === OutlineStatuses.FAILED
          ) {
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          }
        }
      } catch (err) {
        console.error('Error polling course:', err);
      }
    };

    loadCourse();

    // Set up polling if course is generating
    if (
      activeCourse?.id === courseId &&
      activeCourse.outlineStatus !== OutlineStatuses.READY &&
      activeCourse.outlineStatus !== OutlineStatuses.FAILED
    ) {
      pollTimer = setInterval(pollCourse, POLLING_INTERVAL);
    }

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [courseId, activeCourse?.id, activeCourse?.outlineStatus, setActiveCourse]);

  // Auto-start first lesson for courses with 0% progress (frictionless flow)
  // Only triggers when coming from Home without a specific lesson selected
  useEffect(() => {
    // Skip if already showing a lesson or if lesson was specified in route
    if (activeLesson || initialLessonId) return;
    // Skip if course not loaded yet
    if (!activeCourse?.outline?.sections) return;

    // Check if course has 0% progress (no completed lessons)
    const allLessons = activeCourse.outline.sections.flatMap((s) => s.lessons);
    const hasProgress = allLessons.some((l) => l.status === 'completed' || l.status === 'in_progress');

    // Auto-start first lesson only for brand new courses
    if (!hasProgress) {
      const firstSection = activeCourse.outline.sections[0];
      if (firstSection?.lessons?.length > 0) {
        const firstLesson = firstSection.lessons[0];
        // Small delay for smooth transition
        const timer = setTimeout(() => {
          setActiveLesson({
            lessonId: firstLesson.id,
            sectionId: firstSection.id,
            lesson: firstLesson,
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activeCourse, activeLesson, initialLessonId]);

  // Handle lesson selection from overview or sidebar
  const handleLessonSelect = useCallback((lesson: Lesson, sectionId: string) => {
    if (lesson.status === 'locked') return;
    setActiveLesson({ lessonId: lesson.id, sectionId, lesson });
  }, []);

  // Handle continue button - find next available lesson
  const handleContinue = useCallback(() => {
    if (!activeCourse?.outline?.sections) return;

    for (const section of activeCourse.outline.sections) {
      for (const lesson of section.lessons) {
        if (lesson.status === 'pending' || lesson.status === 'in_progress') {
          setActiveLesson({ lessonId: lesson.id, sectionId: section.id, lesson });
          return;
        }
      }
    }
  }, [activeCourse]);

  // Handle lesson completion - auto-advance to next lesson
  const handleLessonComplete = useCallback(
    (nextPosition: LessonPosition | null) => {
      if (nextPosition) {
        // Find the lesson object for the next position
        const section = activeCourse?.outline?.sections?.find(
          (s) => s.id === nextPosition.sectionId
        );
        const lesson = section?.lessons.find((l) => l.id === nextPosition.lessonId);
        setActiveLesson({
          lessonId: nextPosition.lessonId,
          sectionId: nextPosition.sectionId,
          lesson,
        });
      } else {
        // Course complete - go back to overview
        setActiveLesson(null);
      }
    },
    [activeCourse]
  );

  // Handle back from lesson to overview
  const handleBackToOverview = useCallback(() => {
    setActiveLesson(null);
  }, []);

  // Build current position for sidebar highlighting
  const currentPosition: LessonPosition | undefined = activeLesson
    ? {
        sectionId: activeLesson.sectionId,
        lessonId: activeLesson.lessonId,
        sectionIndex: 0,
        lessonIndex: 0,
      }
    : undefined;

  // Loading state
  if (loading) {
    return (
      <LearningLayout courseId={courseId} currentPosition={currentPosition} title="Loading...">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading course...
          </Text>
        </View>
      </LearningLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <LearningLayout courseId={courseId} currentPosition={currentPosition} title="Error">
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>Failed to load course</Text>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
          </View>
        </Card>
      </LearningLayout>
    );
  }

  // Get course title for generating state
  const courseTitle = activeCourse ? getCourseTitle(activeCourse) : undefined;

  // Generating state - show blurred sidebar with motivational content
  if (isGenerating) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title={courseTitle || 'Creating Your Course'}
        isGenerating={true}
        courseTitle={courseTitle}
      >
        <GeneratingContent courseTitle={courseTitle} />
      </LearningLayout>
    );
  }

  // No course or outline (after generation complete or error)
  if (!activeCourse?.outline?.sections) {
    return (
      <LearningLayout courseId={courseId} currentPosition={currentPosition} title="Not Found">
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📭</Text>
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
              No course outline available
            </Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
          </View>
        </Card>
      </LearningLayout>
    );
  }

  return (
    <LearningLayout
      courseId={courseId}
      currentPosition={currentPosition}
      title={activeLesson ? 'Lesson' : getCourseTitle(activeCourse)}
      showBackButton={!activeLesson}
      scrollable={!activeLesson} // Overview is scrollable, lesson manages its own scroll
      onLessonSelect={handleLessonSelect} // SPA-like navigation from sidebar
    >
      {activeLesson ? (
        <LessonContent
          courseId={courseId}
          lessonId={activeLesson.lessonId}
          sectionId={activeLesson.sectionId}
          initialLesson={activeLesson.lesson}
          onLessonComplete={handleLessonComplete}
          onBack={handleBackToOverview}
        />
      ) : (
        <CourseOverview
          course={activeCourse}
          onLessonSelect={handleLessonSelect}
          onContinue={handleContinue}
        />
      )}
    </LearningLayout>
  );
};

const styles = StyleSheet.create({
  // Layout
  overviewContent: {
    flex: 1,
    gap: Spacing.md,
  },
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

  // Generating - full screen state
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  generatingContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  generatingMessage: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  generatingDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  dotDelay1: {
    opacity: 0.4,
  },
  dotDelay2: {
    opacity: 0.2,
  },
  generatingCourseTitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    fontStyle: 'italic',
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

  // Course Header
  headerCard: {
    alignItems: 'center',
  },
  courseEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  courseTitle: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  overallProgress: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.label.small,
  },
  progressValue: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  progressDetail: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.sm,
    minWidth: 200,
  },

  // Sections
  sectionsContainer: {
    gap: Spacing.md,
  },
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

export default CourseViewScreen;
