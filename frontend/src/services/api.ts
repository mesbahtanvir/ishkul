import { apiConfig } from '../config/firebase.config';
import { User, UserDocument, LearningPath, NextStep } from '../types/app';
import { tokenStorage } from './api/tokenStorage';

/**
 * API Response types
 */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure tokens are initialized before making request
  await tokenStorage.initialize();

  const url = `${apiConfig.baseURL}${endpoint}`;
  const accessToken = tokenStorage.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if we have an access token
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && tokenStorage.getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      const newAccessToken = tokenStorage.getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(errorText || `HTTP ${retryResponse.status}`);
      }

      return retryResponse.json();
    }

    // Refresh failed - clear tokens and throw
    await tokenStorage.clearTokens();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Try to refresh the access token
 */
async function tryRefreshToken(): Promise<boolean> {
  const currentRefreshToken = tokenStorage.getRefreshToken();
  if (!currentRefreshToken) return false;

  try {
    const response = await fetch(`${apiConfig.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data: RefreshResponse = await response.json();
    await tokenStorage.saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auth API methods
 */
export const authApi = {
  /**
   * Initialize the auth system - load tokens from storage
   */
  async initialize(): Promise<void> {
    await tokenStorage.initialize();
  },

  /**
   * Check if user has stored tokens
   */
  hasTokens(): boolean {
    return tokenStorage.hasTokens();
  },

  /**
   * Get current access token (for manual use if needed)
   */
  getAccessToken(): string | null {
    return tokenStorage.getAccessToken();
  },

  /**
   * Login with Google ID token
   */
  async loginWithGoogle(googleIdToken: string): Promise<{ user: User }> {
    const response = await fetch(`${apiConfig.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ googleIdToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Login failed');
    }

    const data: LoginResponse = await response.json();

    // Store tokens using tokenStorage
    await tokenStorage.saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });

    // Convert backend user to frontend user format
    const user: User = {
      uid: data.user.uid || (data.user as unknown as { id: string }).id,
      email: data.user.email,
      displayName: data.user.displayName,
      photoURL: data.user.photoURL,
    };

    return { user };
  },

  /**
   * Logout - clear local tokens and notify backend
   */
  async logout(): Promise<void> {
    try {
      // Notify backend (ignore errors - we're logging out anyway)
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        await fetch(`${apiConfig.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }).catch(() => {
          // Ignore network errors during logout
        });
      }
    } finally {
      // Always clear local tokens
      await tokenStorage.clearTokens();
    }
  },

  /**
   * Check authentication state
   * Returns the current user if tokens are valid
   */
  async checkAuth(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    // Ensure tokens are initialized
    await tokenStorage.initialize();

    // No tokens - not authenticated
    if (!tokenStorage.hasTokens()) {
      return { user: null, isAuthenticated: false };
    }

    // If we have tokens, try to validate by making a request
    try {
      const response = await apiRequest<{ user: User }>('/me', {
        method: 'GET',
      });

      const user: User = {
        uid: response.user.uid || (response.user as unknown as { id: string }).id,
        email: response.user.email,
        displayName: response.user.displayName,
        photoURL: response.user.photoURL,
      };

      return { user, isAuthenticated: true };
    } catch {
      // Token validation failed
      await tokenStorage.clearTokens();
      return { user: null, isAuthenticated: false };
    }
  },

  /**
   * Refresh tokens manually
   */
  async refresh(): Promise<boolean> {
    return tryRefreshToken();
  },
};

/**
 * Generic API methods for other endpoints
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }),
  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

/**
 * User API methods for profile and learning data
 */
export const userApi = {
  /**
   * Get user document (profile + learning data)
   */
  async getUserDocument(): Promise<UserDocument | null> {
    try {
      const response = await api.get<{ document: UserDocument }>('/me/document');
      return response.document;
    } catch {
      return null;
    }
  },

  /**
   * Create or initialize user document with goal and level
   */
  async createUserDocument(goal: string, level: string): Promise<void> {
    await api.post('/me/document', { goal, level });
  },

  /**
   * Update user's goal and level
   */
  async updateGoalAndLevel(goal: string, level: string): Promise<void> {
    await api.patch('/me', { goal, level });
  },

  /**
   * Add a history entry
   */
  async addHistory(entry: { type: string; topic: string; score?: number }): Promise<void> {
    await api.post('/me/history', entry);
  },

  /**
   * Set the next recommended step
   */
  async setNextStep(nextStep: {
    type: string;
    topic: string;
    title?: string;
    content?: string;
    question?: string;
    answer?: string;
    task?: string;
  }): Promise<void> {
    await api.put('/me/next-step', nextStep);
  },

  /**
   * Clear the next step
   */
  async clearNextStep(): Promise<void> {
    await api.delete('/me/next-step');
  },

  /**
   * Update memory for a specific topic
   */
  async updateMemory(memory: {
    topic: string;
    confidence: number;
    timesTested: number;
  }): Promise<void> {
    await api.post('/me/memory', memory);
  },
};

/**
 * Learning Paths API methods
 */
export const learningPathsApi = {
  /**
   * Get all learning paths for the user
   */
  async getPaths(): Promise<LearningPath[]> {
    try {
      const response = await api.get<{ paths: LearningPath[] }>('/learning-paths');
      return response.paths || [];
    } catch {
      return [];
    }
  },

  /**
   * Get a specific learning path
   */
  async getPath(pathId: string): Promise<LearningPath | null> {
    try {
      const response = await api.get<{ path: LearningPath }>(`/learning-paths/${pathId}`);
      return response.path;
    } catch {
      return null;
    }
  },

  /**
   * Create a new learning path
   */
  async createPath(path: LearningPath): Promise<LearningPath> {
    const response = await api.post<{ path: LearningPath }>('/learning-paths', path);
    return response.path;
  },

  /**
   * Update a learning path
   */
  async updatePath(pathId: string, updates: Partial<LearningPath>): Promise<void> {
    await api.patch(`/learning-paths/${pathId}`, updates);
  },

  /**
   * Delete a learning path
   */
  async deletePath(pathId: string): Promise<void> {
    await api.delete(`/learning-paths/${pathId}`);
  },

  /**
   * Start/continue a learning session - get next step
   */
  async getNextStep(pathId: string): Promise<NextStep> {
    const response = await api.post<{ step: NextStep }>(`/learning-paths/${pathId}/session`);
    return response.step;
  },

  /**
   * Complete current step in a learning path
   */
  async completeStep(
    pathId: string,
    stepData: { type: string; topic: string; score?: number }
  ): Promise<{ path: LearningPath; nextStep?: NextStep }> {
    const response = await api.post<{ path: LearningPath; nextStep?: NextStep }>(
      `/learning-paths/${pathId}/complete`,
      stepData
    );
    return response;
  },

  /**
   * Update memory for a topic in a specific learning path
   */
  async updatePathMemory(
    pathId: string,
    memory: { topic: string; confidence: number; timesTested: number }
  ): Promise<void> {
    await api.post(`/learning-paths/${pathId}/memory`, memory);
  },
};

export default api;
