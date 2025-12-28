/**
 * Courses API module
 *
 * Handles course-related API operations including:
 * - Create, update, delete courses
 * - Course status management (archive/unarchive)
 *
 * Note: GET operations (list/get) are removed.
 * Course data is now fetched via Firebase real-time subscriptions.
 */

import { Course } from '../../types/app';
import { apiClient } from './client';

// =============================================================================
// Response Types
// =============================================================================

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
   * Create a new course
   */
  async createCourse(course: Partial<Course>): Promise<Course> {
    const response = await apiClient.post<CourseResponse>('/courses', course);
    return response.course;
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
    return response.course;
  },

  /**
   * Restore an archived course to active status
   */
  async restoreCourse(courseId: string): Promise<Course> {
    const response = await apiClient.post<CourseResponse>(
      `/courses/${courseId}/unarchive`
    );
    return response.course;
  },
};
