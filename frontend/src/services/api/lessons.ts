/**
 * Lessons API module
 *
 * Handles 3-stage content generation:
 * 1. Get lesson metadata
 * 2. Generate block skeletons
 * 3. Generate block content on-demand
 */

import {
  Lesson,
  LessonProgress,
  GetLessonResponse,
  GenerateBlocksResponse,
  GenerateBlockContentResponse,
  CompleteBlockRequest,
  CompleteBlockResponse,
} from '../../types/app';
import { apiClient } from './client';

// =============================================================================
// Response Types
// =============================================================================

interface SectionLessonsResponse {
  lessons: Lesson[];
}

// =============================================================================
// Lessons API
// =============================================================================

export const lessonsApi = {
  // ---------------------------------------------------------------------------
  // Lesson Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get a specific lesson with its blocks
   */
  async getLesson(courseId: string, lessonId: string): Promise<GetLessonResponse> {
    return apiClient.get<GetLessonResponse>(
      `/courses/${courseId}/lessons/${lessonId}`
    );
  },

  /**
   * Get all lessons for a section (for progress display)
   */
  async getSectionLessons(
    courseId: string,
    sectionId: string
  ): Promise<SectionLessonsResponse> {
    return apiClient.get<SectionLessonsResponse>(
      `/courses/${courseId}/sections/${sectionId}/lessons`
    );
  },

  // ---------------------------------------------------------------------------
  // Block Generation (3-Stage System)
  // ---------------------------------------------------------------------------

  /**
   * Generate blocks for a lesson (Stage 2).
   * Returns block skeletons with contentStatus: 'pending'.
   */
  async generateBlocks(
    courseId: string,
    lessonId: string
  ): Promise<GenerateBlocksResponse> {
    return apiClient.post<GenerateBlocksResponse>(
      `/courses/${courseId}/lessons/${lessonId}/generate-blocks`
    );
  },

  /**
   * Generate content for a specific block (Stage 3).
   * Returns the block content based on block type.
   */
  async generateBlockContent(
    courseId: string,
    lessonId: string,
    blockId: string
  ): Promise<GenerateBlockContentResponse> {
    return apiClient.post<GenerateBlockContentResponse>(
      `/courses/${courseId}/lessons/${lessonId}/blocks/${blockId}/generate`
    );
  },

  // ---------------------------------------------------------------------------
  // Block Completion
  // ---------------------------------------------------------------------------

  /**
   * Complete a block and record the result
   */
  async completeBlock(
    courseId: string,
    lessonId: string,
    blockId: string,
    data?: CompleteBlockRequest
  ): Promise<CompleteBlockResponse> {
    return apiClient.post<CompleteBlockResponse>(
      `/courses/${courseId}/lessons/${lessonId}/blocks/${blockId}/complete`,
      data || {}
    );
  },

  // ---------------------------------------------------------------------------
  // Progress Management
  // ---------------------------------------------------------------------------

  /**
   * Update lesson progress (for partial saves)
   */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    progress: Partial<LessonProgress>
  ): Promise<void> {
    await apiClient.patch(
      `/courses/${courseId}/lessons/${lessonId}/progress`,
      progress
    );
  },
};
