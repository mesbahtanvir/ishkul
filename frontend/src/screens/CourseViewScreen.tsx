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
 * All course data comes from Firebase real-time subscriptions.
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CourseOverviewSkeleton } from '../components/skeletons';
import { useTheme } from '../hooks/useTheme';
import { useCoursesStore } from '../state/coursesStore';
import { useCourseSubscription } from '../hooks/useCourseSubscription';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import {
  Lesson,
  LessonPosition,
  OutlineStatuses,
  getCourseTitle,
} from '../types/app';
import { LessonContent } from './CourseView';

type CourseViewScreenProps = NativeStackScreenProps<RootStackParamList, 'CourseView'>;

/**
 * Main CourseViewScreen component
 */
export const CourseViewScreen: React.FC<CourseViewScreenProps> = ({ navigation, route }) => {
  const { courseId, lessonId: initialLessonId, sectionId: initialSectionId } = route.params;
  const { colors } = useTheme();
  const { activeCourse } = useCoursesStore();

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

  const [error, setError] = useState<string | null>(null);

  // Detect if course is in generating state
  const isGenerating =
    activeCourse?.id === courseId &&
    activeCourse.outlineStatus !== OutlineStatuses.READY &&
    activeCourse.outlineStatus !== OutlineStatuses.FAILED;

  // Always auto-select first lesson when outline is ready (SPA philosophy - no CourseOverview)
  // This ensures we always show the LessonContent layout
  const shouldAutoSelectFirstLesson = useMemo(() => {
    // Don't auto-select if lesson was specified in route params
    if (initialLessonId) return false;
    // Don't auto-select if already showing a lesson
    if (activeLesson) return false;
    // Can only auto-select if outline is ready with sections
    if (!activeCourse?.outline?.sections?.length) return false;
    return true;
  }, [activeCourse, activeLesson, initialLessonId]);

  // Use Firebase subscription for real-time course data
  // Always enabled - this is the only source of course data
  const { connectionError } = useCourseSubscription(courseId, {
    enabled: true, // Always subscribe for real-time data
    onError: (err) => {
      console.error('Firebase subscription error in CourseViewScreen:', err.message);
      setError(err.message);
    },
  });

  // Log connection errors for debugging
  useEffect(() => {
    if (connectionError) {
      console.warn('Course subscription connection error:', connectionError);
    }
  }, [connectionError]);

  // Auto-select first lesson when outline is ready (SPA philosophy - always show LessonContent)
  // Triggers immediately when outline becomes available
  useEffect(() => {
    if (!shouldAutoSelectFirstLesson) return;
    if (!activeCourse?.outline?.sections?.length) return;

    const firstSection = activeCourse.outline.sections[0];
    if (firstSection?.lessons?.length > 0) {
      const firstLesson = firstSection.lessons[0];
      // Set immediately - always go to lesson view
      setActiveLesson({
        lessonId: firstLesson.id,
        sectionId: firstSection.id,
        lesson: firstLesson,
      });
    }
  }, [shouldAutoSelectFirstLesson, activeCourse]);

  // Handle lesson selection from sidebar
  const handleLessonSelect = useCallback((lesson: Lesson, sectionId: string) => {
    if (lesson.status === 'locked') return;
    setActiveLesson({ lessonId: lesson.id, sectionId, lesson });
  }, []);

  // Handle lesson completion - auto-advance to next lesson or navigate back when course complete
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
        // Course complete - navigate back to home
        navigation.goBack();
      }
    },
    [activeCourse, navigation]
  );

  // Build current position for sidebar highlighting
  const currentPosition: LessonPosition | undefined = activeLesson
    ? {
        sectionId: activeLesson.sectionId,
        lessonId: activeLesson.lessonId,
        sectionIndex: 0,
        lessonIndex: 0,
      }
    : undefined;

  // Loading state - show skeleton while waiting for Firebase subscription to provide data
  const isLoading = !activeCourse || activeCourse.id !== courseId;
  if (isLoading && !error) {
    return (
      <LearningLayout courseId={courseId} currentPosition={currentPosition} title="Loading...">
        <CourseOverviewSkeleton sectionCount={3} />
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

  // Get course title for display
  const courseTitle = activeCourse ? getCourseTitle(activeCourse) : undefined;

  // Generating state - show LessonContent with blurred sidebar (outline generating)
  // This is the new SPA approach: always show LessonContent layout with appropriate blur states
  if (isGenerating) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title={courseTitle || 'Creating Your Course'}
        isGenerating={true}
        courseTitle={courseTitle}
      >
        <LessonContent
          courseId={courseId}
          lessonId=""
          sectionId=""
          isOutlineGenerating={true}
          courseTitle={courseTitle}
          onLessonComplete={handleLessonComplete}
          onBack={() => navigation.goBack()}
        />
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

  // Transitioning to first lesson - show skeleton briefly while auto-select happens
  if (shouldAutoSelectFirstLesson && !activeLesson) {
    return (
      <LearningLayout
        courseId={courseId}
        currentPosition={currentPosition}
        title={courseTitle || 'Starting Your Course'}
        isGenerating={false}
        courseTitle={courseTitle}
        onLessonSelect={handleLessonSelect}
      >
        <CourseOverviewSkeleton sectionCount={3} />
      </LearningLayout>
    );
  }

  // Normal lesson view - always show LessonContent (no CourseOverview)
  // If no activeLesson at this point, select the first available lesson
  const effectiveLesson = activeLesson || (() => {
    const firstSection = activeCourse.outline.sections[0];
    const firstLesson = firstSection?.lessons?.[0];
    return firstLesson ? {
      lessonId: firstLesson.id,
      sectionId: firstSection.id,
      lesson: firstLesson,
    } : null;
  })();

  if (!effectiveLesson) {
    return (
      <LearningLayout courseId={courseId} currentPosition={currentPosition} title="No Lessons">
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📭</Text>
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
              No lessons available
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
      title="Lesson"
      showBackButton={false}
      scrollable={false}
      onLessonSelect={handleLessonSelect}
    >
      <LessonContent
        courseId={courseId}
        lessonId={effectiveLesson.lessonId}
        sectionId={effectiveLesson.sectionId}
        initialLesson={effectiveLesson.lesson}
        onLessonComplete={handleLessonComplete}
        onBack={() => navigation.goBack()}
      />
    </LearningLayout>
  );
};

const styles = StyleSheet.create({
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
});

export default CourseViewScreen;
