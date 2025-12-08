/**
 * Context API module
 *
 * Handles user profile context operations:
 * - Get/update user learning context
 * - Derived context from usage patterns
 * - AI-ready context summaries
 */

import {
  UserContext,
  ParsedContext,
  ContextUpdateResponse,
  DerivedContext,
} from '../../types/app';
import { apiClient, ApiError } from './client';

// =============================================================================
// Response Types
// =============================================================================

interface ContextResponse {
  context: UserContext;
}

interface DerivedContextResponse {
  derived: DerivedContext;
}

interface ContextSummaryResponse {
  summary: string;
}

// =============================================================================
// Context API
// =============================================================================

export const contextApi = {
  // ---------------------------------------------------------------------------
  // Context Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get user's full context
   */
  async getContext(): Promise<UserContext | null> {
    try {
      const response = await apiClient.get<ContextResponse>('/context');
      return response.context;
    } catch (error) {
      // Return null if context doesn't exist yet
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get derived context (auto-calculated from usage patterns)
   */
  async getDerivedContext(): Promise<DerivedContext> {
    const response = await apiClient.get<DerivedContextResponse>('/context/derived');
    return response.derived;
  },

  /**
   * Get AI-ready context summary
   */
  async getContextSummary(): Promise<string> {
    const response = await apiClient.get<ContextSummaryResponse>('/context/summary');
    return response.summary;
  },

  // ---------------------------------------------------------------------------
  // Context Updates
  // ---------------------------------------------------------------------------

  /**
   * Update context with new user input.
   * Sends both previous context and new input for AI to merge.
   */
  async updateContext(
    previousContext: ParsedContext,
    newInput: string
  ): Promise<ContextUpdateResponse> {
    return apiClient.put<ContextUpdateResponse>('/context/update', {
      previousContext,
      newInput,
    });
  },

  /**
   * Apply confirmed context update
   */
  async applyContext(context: UserContext): Promise<void> {
    await apiClient.put('/context', { context });
  },
};
