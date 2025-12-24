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
    return response.courses || [];
  },

  /**
   * Get a specific course by ID
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const response = await apiClient.get<CourseResponse>(`/courses/${courseId}`);
    return response.course || null;
  },

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
