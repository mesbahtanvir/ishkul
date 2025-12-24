/**
 * Course Helpers - Utilities for working with courses
 */

import { Course, Section, Lesson, LessonPosition } from '../types/app';

/**
 * Check if a course uses the new section/lesson structure
 * Returns true if the course has sections with lessons, false for legacy step-based courses
 */
export function usesNewStructure(course: Course | null): boolean {
  if (!course) return false;

  // New structure: has outline with sections containing lessons
  const hasNewStructure =
    course.outline?.sections &&
    Array.isArray(course.outline.sections) &&
    course.outline.sections.length > 0 &&
    course.outline.sections.some(
      (section) => section.lessons && section.lessons.length > 0
    );

  return !!hasNewStructure;
}

/**
 * Check if a course has a valid outline structure
 */
export function hasOutline(course: Course | null): boolean {
  return usesNewStructure(course);
}

/**
 * Get the first available lesson position in a course
 * Returns the first non-completed lesson, or the first lesson if all are complete
 */
export function getFirstLessonPosition(course: Course): LessonPosition | null {
  if (!course.outline?.sections) return null;

  for (let sectionIndex = 0; sectionIndex < course.outline.sections.length; sectionIndex++) {
    const section = course.outline.sections[sectionIndex];
    for (let lessonIndex = 0; lessonIndex < section.lessons.length; lessonIndex++) {
      const lesson = section.lessons[lessonIndex];
      if (lesson.status !== 'completed' && lesson.status !== 'skipped') {
        return {
          sectionId: section.id,
          lessonId: lesson.id,
          sectionIndex,
          lessonIndex,
        };
      }
    }
  }

  // All lessons completed, return first lesson
  const firstSection = course.outline.sections[0];
  if (firstSection?.lessons.length > 0) {
    return {
      sectionId: firstSection.id,
      lessonId: firstSection.lessons[0].id,
      sectionIndex: 0,
      lessonIndex: 0,
    };
  }

  return null;
}

/**
 * Get the current lesson position from course state or calculate it
 */
export function getCurrentLessonPosition(course: Course): LessonPosition | null {
  // Use stored position if available
  if (course.currentPosition) {
    return course.currentPosition;
  }

  // Otherwise calculate from lesson statuses
  return getFirstLessonPosition(course);
}

/**
 * Calculate overall course progress percentage
 */
export function calculateCourseProgress(course: Course): number {
  if (!course.outline?.sections) {
    // Fallback to legacy progress if no sections
    return course.progress || 0;
  }

  let completedLessons = 0;
  let totalLessons = 0;

  for (const section of course.outline.sections) {
    for (const lesson of section.lessons) {
      totalLessons++;
      if (lesson.status === 'completed') {
        completedLessons++;
      }
    }
  }

  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

/**
 * Get section progress
 */
export function getSectionProgress(section: Section): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = section.lessons.length;
  const completed = section.lessons.filter((l) => l.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Check if all sections in a course are complete
 */
export function isCourseComplete(course: Course): boolean {
  if (!course.outline?.sections) return false;

  for (const section of course.outline.sections) {
    for (const lesson of section.lessons) {
      if (lesson.status !== 'completed') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Find a lesson by ID across all sections
 */
export function findLesson(
  course: Course,
  lessonId: string
): { lesson: Lesson; sectionId: string } | null {
  if (!course.outline?.sections) return null;

  for (const section of course.outline.sections) {
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { lesson, sectionId: section.id };
    }
  }

  return null;
}
