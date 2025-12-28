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

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearningLayout } from '../components/LearningLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
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
import { GeneratingContent, CourseOverview, LessonContent } from './CourseView';

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

  // Loading state - show while waiting for Firebase subscription to provide data
  const isLoading = !activeCourse || activeCourse.id !== courseId;
  if (isLoading && !error) {
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
