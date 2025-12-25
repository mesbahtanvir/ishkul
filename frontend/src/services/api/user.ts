import { apiClient } from './client';
import { UserDocument } from '../../types/app';

// Backend response types
interface BackendUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendUserDocument extends BackendUser {
  courses?: unknown[];
}

// Transform backend response to frontend UserDocument
function transformUserDocument(backend: BackendUserDocument): UserDocument {
  return {
    uid: backend.id,
    email: backend.email,
    displayName: backend.displayName,
    courses: [], // Courses are fetched separately via courses API
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
    displayName?: string;
  }): Promise<BackendUser> {
    return apiClient.put<BackendUser>('/me', data);
  },

  /**
   * Get full user document (including learning data)
   * Throws error on API failure so caller can handle appropriately
   */
  async getUserDocument(): Promise<UserDocument> {
    try {
      const response = await apiClient.get<BackendUserDocument>('/me/document');
      return transformUserDocument(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting user document:', { message: errorMessage, error });
      throw error;
    }
  },

  /**
   * Create/initialize user document
   */
  async createUserDocument(): Promise<UserDocument> {
    const response = await apiClient.post<BackendUserDocument>('/me/document', {});
    return transformUserDocument(response);
  },
};
