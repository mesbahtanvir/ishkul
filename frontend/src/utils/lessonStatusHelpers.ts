/**
 * Shared utilities for lesson status display
 * Extracted from CourseViewScreen, CourseOutlineScreen, and LearningLayout
 */

import { LessonStatus } from '../types/app';
import { useTheme } from '../hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

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
