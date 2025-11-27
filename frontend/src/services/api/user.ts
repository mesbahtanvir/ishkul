import { apiClient } from './client';
import { UserDocument, HistoryEntry, NextStep, LevelType } from '../../types/app';

// Backend response types
interface BackendUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  goal?: string;
  level?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendUserDocument extends BackendUser {
  memory?: {
    topics: {
      [topic: string]: {
        confidence: number;
        lastReviewed: string;
        timesTested: number;
      };
    };
  };
  history?: Array<{
    type: string;
    topic: string;
    score?: number;
    timestamp: number;
  }>;
  nextStep?: {
    type: string;
    topic: string;
    title?: string;
    content?: string;
    question?: string;
    options?: string[];
    answer?: string;
    task?: string;
  };
}

// Transform backend response to frontend UserDocument
function transformUserDocument(backend: BackendUserDocument): UserDocument {
  return {
    uid: backend.id,
    email: backend.email,
    displayName: backend.displayName,
    goal: backend.goal || '',
    level: (backend.level as LevelType) || 'beginner',
    memory: backend.memory || { topics: {} },
    history: (backend.history || []).map(h => ({
      type: h.type as 'lesson' | 'quiz' | 'practice',
      topic: h.topic,
      score: h.score,
      timestamp: h.timestamp,
    })),
    nextStep: backend.nextStep ? {
      type: backend.nextStep.type as 'lesson' | 'quiz' | 'practice',
      topic: backend.nextStep.topic,
      title: backend.nextStep.title,
      content: backend.nextStep.content,
      question: backend.nextStep.question,
      expectedAnswer: backend.nextStep.answer,
      task: backend.nextStep.task,
    } : undefined,
    createdAt: new Date(backend.createdAt).getTime(),
    updatedAt: new Date(backend.updatedAt).getTime(),
  };
}

export const userApi = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<BackendUser> {
    return apiClient.get<BackendUser>('/me');
  },

  /**
   * Update current user's profile
   */
  async updateProfile(data: {
    goal?: string;
    level?: string;
    displayName?: string;
  }): Promise<BackendUser> {
    return apiClient.put<BackendUser>('/me', data);
  },

  /**
   * Get full user document (including learning data)
   */
  async getUserDocument(): Promise<UserDocument | null> {
    try {
      const response = await apiClient.get<BackendUserDocument>('/me/document');
      return transformUserDocument(response);
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  },

  /**
   * Create/initialize user document with goal and level
   */
  async createUserDocument(
    goal: string,
    level: LevelType
  ): Promise<UserDocument> {
    const response = await apiClient.post<BackendUserDocument>('/me/document', {
      goal,
      level,
    });
    return transformUserDocument(response);
  },

  /**
   * Update user's goal and level
   */
  async updateGoalAndLevel(
    goal: string,
    level: LevelType
  ): Promise<BackendUser> {
    return apiClient.put<BackendUser>('/me', { goal, level });
  },

  /**
   * Add a history entry
   */
  async addHistory(entry: {
    type: string;
    topic: string;
    score?: number;
  }): Promise<{ success: boolean; entry: HistoryEntry }> {
    return apiClient.post('/me/history', entry);
  },

  /**
   * Get next step
   */
  async getNextStep(): Promise<NextStep | null> {
    const response = await apiClient.get<{ nextStep: NextStep | null }>('/me/next-step');
    return response.nextStep;
  },

  /**
   * Set next step
   */
  async setNextStep(nextStep: {
    type: string;
    topic: string;
    title?: string;
    content?: string;
    question?: string;
    options?: string[];
    answer?: string;
    task?: string;
  }): Promise<{ success: boolean; nextStep: NextStep }> {
    return apiClient.put('/me/next-step', nextStep);
  },

  /**
   * Clear next step
   */
  async clearNextStep(): Promise<{ success: boolean }> {
    return apiClient.delete('/me/next-step');
  },

  /**
   * Update memory for a topic
   */
  async updateMemory(data: {
    topic: string;
    confidence: number;
    timesTested: number;
  }): Promise<{ success: boolean }> {
    return apiClient.post('/me/memory', data);
  },
};
