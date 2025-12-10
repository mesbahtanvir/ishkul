/**
 * Courses API module
 *
 * Handles all course-related API operations including:
 * - CRUD operations for courses
 * - Step management (next step, complete, view)
 * - Course memory updates
 */

import { Course, Step, StepCompleteRequest } from '../../types/app';
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

interface NextStepResponse {
  step: Step;
  stepIndex: number;
}

interface CompleteStepResponse {
  course: Course;
  completedStep: Step;
  nextStepNeeded: boolean;
}

interface ViewStepResponse {
  success: boolean;
  step: Step;
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

  // ---------------------------------------------------------------------------
  // Step Operations
  // ---------------------------------------------------------------------------

  /**
   * Get next step for a course.
   * Returns existing incomplete step or generates a new one.
   */
  async getNextStep(courseId: string): Promise<NextStepResponse> {
    return apiClient.post<NextStepResponse>(`/courses/${courseId}/next`);
  },

  /**
   * Complete the current step (legacy endpoint).
   * Completes the first incomplete step in the course.
   */
  async completeCurrentStep(
    courseId: string,
    data?: StepCompleteRequest
  ): Promise<CompleteStepResponse> {
    const response = await apiClient.post<CompleteStepResponse>(
      `/courses/${courseId}/complete`,
      data || {}
    );
    return {
      ...response,
      course: normalizeCourse(response.course)!,
    };
  },

  /**
   * Complete a specific step by ID
   */
  async completeStep(
    courseId: string,
    stepId: string,
    data?: StepCompleteRequest
  ): Promise<CompleteStepResponse> {
    const response = await apiClient.post<CompleteStepResponse>(
      `/courses/${courseId}/steps/${stepId}/complete`,
      data || {}
    );
    return {
      ...response,
      course: normalizeCourse(response.course)!,
    };
  },

  /**
   * Record a step view (updates lastReviewed in memory)
   */
  async viewStep(courseId: string, stepId: string): Promise<ViewStepResponse> {
    return apiClient.post<ViewStepResponse>(
      `/courses/${courseId}/steps/${stepId}/view`
    );
  },

  // ---------------------------------------------------------------------------
  // Memory Operations
  // ---------------------------------------------------------------------------

  /**
   * Update memory for a specific topic in a course
   */
  async updateCourseMemory(
    courseId: string,
    memory: { topic: string; confidence: number; timesTested: number }
  ): Promise<void> {
    await apiClient.post(`/courses/${courseId}/memory`, memory);
  },
};
