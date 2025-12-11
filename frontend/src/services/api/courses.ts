/**
 * Courses API module
 *
 * Handles all course-related API operations including:
 * - CRUD operations for courses
 * - Course status management (archive/unarchive)
 */

import { Course } from '../../types/app';
import { apiClient } from './client';

// =============================================================================
// Course Normalization
// =============================================================================

/**
 * Normalize a course to ensure steps is always an array.
 * Handles legacy data that may have null/undefined steps.
 */
const normalizeCourse = (course: Course | null): Course | null => {
  if (!course) return null;
  return {
    ...course,
    steps: Array.isArray(course.steps) ? course.steps : [],
    memory: course.memory || { topics: {} },
  };
};

// =============================================================================
// Response Types
// =============================================================================

interface CoursesListResponse {
  courses: Course[];
}

interface CourseResponse {
  course: Course;
}

// =============================================================================
// Courses API
// =============================================================================

export const coursesApi = {
  // ---------------------------------------------------------------------------
  // Course CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all courses for the current user
   */
  async getCourses(): Promise<Course[]> {
    const response = await apiClient.get<CoursesListResponse>('/courses');
    const courses = response.courses || [];
    return courses.map((c) => normalizeCourse(c)!);
  },

  /**
   * Get a specific course by ID
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const response = await apiClient.get<CourseResponse>(`/courses/${courseId}`);
    return normalizeCourse(response.course);
  },

  /**
   * Create a new course
   */
  async createCourse(course: Partial<Course>): Promise<Course> {
    const response = await apiClient.post<CourseResponse>('/courses', course);
    return normalizeCourse(response.course)!;
  },

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    await apiClient.patch(`/courses/${courseId}`, updates);
  },

  /**
   * Delete a course (soft delete)
   */
  async deleteCourse(courseId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}`);
  },

  // ---------------------------------------------------------------------------
  // Course Status Operations
  // ---------------------------------------------------------------------------

  /**
   * Archive an active course
   */
  async archiveCourse(courseId: string): Promise<Course> {
    const response = await apiClient.post<CourseResponse>(
      `/courses/${courseId}/archive`
    );
    return normalizeCourse(response.course)!;
  },

  /**
   * Restore an archived course to active status
   */
  async restoreCourse(courseId: string): Promise<Course> {
    const response = await apiClient.post<CourseResponse>(
      `/courses/${courseId}/unarchive`
    );
    return normalizeCourse(response.course)!;
  },
};
