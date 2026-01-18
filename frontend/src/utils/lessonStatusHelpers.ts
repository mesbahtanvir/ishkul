/**
 * Shared utilities for lesson status display
 * Extracted from CourseViewScreen, CourseOutlineScreen, and LearningLayout
 */

import { Lesson, LessonStatus, ContentStatus } from '../types/app';
import { useTheme } from '../hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

/**
 * Derive effective lesson status including 'locked' based on blocksStatus.
 * This enables progressive unlocking: lessons unlock as content is generated.
 *
 * A lesson is unlocked (not 'locked') if:
 * - It's the first lesson (sectionIndex=0, lessonIndex=0)
 * - It's completed or in-progress
 * - Its block generation has started (blocksStatus !== 'pending')
 *
 * @param lesson The lesson to check
 * @param lessonIndex The index of this lesson within its section
 * @param sectionIndex The index of the section containing this lesson
 * @returns The effective status, potentially 'locked' if lesson is not yet accessible
 */
export const getEffectiveLessonStatus = (
  lesson: Lesson,
  lessonIndex: number,
  sectionIndex: number
): LessonStatus => {
  // Completed or in-progress = use actual status
  if (lesson.status === 'completed' || lesson.status === 'in_progress') {
    return lesson.status;
  }

  // First lesson is always unlocked
  if (sectionIndex === 0 && lessonIndex === 0) {
    return lesson.status || 'pending';
  }

  // Generation started = unlocked (blocksStatus is not pending/undefined)
  if (lesson.blocksStatus && lesson.blocksStatus !== 'pending') {
    return lesson.status || 'pending';
  }

  // Otherwise locked - content not yet generated
  return 'locked';
};

/**
 * Get status icon for lesson
 */
export const getLessonStatusIcon = (status: LessonStatus): string => {
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
export const getLessonStatusColor = (
  status: LessonStatus,
  colors: ThemeColors
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
