import { apiConfig } from '../config/firebase.config';
import { User, UserDocument, Course, Step, StepCompleteRequest } from '../types/app';
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
 * API Error Response from backend
 */
interface ApiErrorResponse {
  code: string;
  message: string;
}

/**
 * Error codes from backend (kept in sync with backend/internal/handlers/auth.go)
 */
export const ErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  // Course error codes
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  COURSE_ARCHIVED: 'COURSE_ARCHIVED',
  COURSE_DELETED: 'COURSE_DELETED',
  // Subscription limit error codes
  COURSE_LIMIT_REACHED: 'COURSE_LIMIT_REACHED',
  DAILY_STEP_LIMIT_REACHED: 'DAILY_STEP_LIMIT_REACHED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Custom API Error class with error code support
 */
export class ApiError extends Error {
  code: ErrorCode;
  statusCode?: number;

  constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Parse error response from backend
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const text = await response.text();
    // Try to parse as JSON error response
    const errorData: ApiErrorResponse = JSON.parse(text);
    if (errorData.code && errorData.message) {
      return new ApiError(errorData.code as ErrorCode, errorData.message, response.status);
    }
    // Fallback to plain text error
    return new ApiError(ErrorCodes.INTERNAL_ERROR, text || `HTTP ${response.status}`, response.status);
  } catch {
    return new ApiError(ErrorCodes.INTERNAL_ERROR, `HTTP ${response.status}`, response.status);
  }
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(ErrorCodes.NETWORK_ERROR, 'Unable to connect. Please check your internet connection.');
  }

  // Handle 401 - try to refresh token
  if (response.status === 401 && tokenStorage.getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      const newAccessToken = tokenStorage.getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
      let retryResponse: Response;
      try {
        retryResponse = await fetch(url, {
          ...options,
          headers,
        });
      } catch {
        throw new ApiError(ErrorCodes.NETWORK_ERROR, 'Unable to connect. Please check your internet connection.');
      }

      if (!retryResponse.ok) {
        throw await parseErrorResponse(retryResponse);
      }

      return retryResponse.json();
    }

    // Refresh failed - clear tokens and throw
    await tokenStorage.clearTokens();
    throw new ApiError(ErrorCodes.TOKEN_EXPIRED, 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
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
  } catch (error) {
    console.error('Error refreshing token:', error);
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
    let response: Response;
    try {
      response = await fetch(`${apiConfig.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleIdToken }),
      });
    } catch {
      throw new ApiError(ErrorCodes.NETWORK_ERROR, 'Unable to connect. Please check your internet connection.');
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
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
   * Login with email and password
   */
  async loginWithEmail(email: string, password: string): Promise<{ user: User }> {
    let response: Response;
    try {
      response = await fetch(`${apiConfig.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new ApiError(ErrorCodes.NETWORK_ERROR, 'Unable to connect. Please check your internet connection.');
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
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
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<{ user: User }> {
    let response: Response;
    try {
      response = await fetch(`${apiConfig.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, displayName }),
      });
    } catch {
      throw new ApiError(ErrorCodes.NETWORK_ERROR, 'Unable to connect. Please check your internet connection.');
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
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
      // Backend returns user directly, not wrapped in { user: ... }
      const response = await apiRequest<{
        id: string;
        email: string;
        displayName: string;
        photoUrl?: string;
      }>('/me', {
        method: 'GET',
      });

      const user: User = {
        uid: response.id,
        email: response.email,
        displayName: response.displayName,
        photoURL: response.photoUrl || null,
      };

      return { user, isAuthenticated: true };
    } catch (error) {
      // Token validation failed
      console.error('Error validating auth token:', error);
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
    const response = await api.get<{ document: UserDocument }>('/me/document');
    return response.document;
  },

  /**
   * Create or initialize user document with goal
   * Level is no longer required - AI adapts based on user context
   */
  async createUserDocument(goal: string): Promise<void> {
    await api.post('/me/document', { goal });
  },

  /**
   * Update user's goal
   */
  async updateGoal(goal: string): Promise<void> {
    await api.patch('/me', { goal });
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
 * Normalize a course to ensure steps is always an array
 * This handles legacy data that may have null/undefined steps or old 'history' field
 */
const normalizeCourse = (course: Course | null): Course | null => {
  if (!course) return null;
  return {
    ...course,
    steps: Array.isArray(course.steps) ? course.steps : [],
    memory: course.memory || { topics: {} },
  };
};

/**
 * Courses API methods
 */
export const coursesApi = {
  /**
   * Get all courses for the user
   */
  async getCourses(): Promise<Course[]> {
    const response = await api.get<{ courses: Course[] }>('/courses');
    const courses = response.courses || [];
    return courses.map((c) => normalizeCourse(c)!);
  },

  /**
   * Get a specific course
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const response = await api.get<{ course: Course }>(`/courses/${courseId}`);
    return normalizeCourse(response.course);
  },

  /**
   * Create a new course
   */
  async createCourse(course: Partial<Course>): Promise<Course> {
    const response = await api.post<{ course: Course }>('/courses', course);
    return normalizeCourse(response.course)!;
  },

  /**
   * Update a course
   */
  async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    await api.patch(`/courses/${courseId}`, updates);
  },

  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    await api.delete(`/courses/${courseId}`);
  },

  /**
   * Archive a course
   */
  async archiveCourse(courseId: string): Promise<Course> {
    const response = await api.post<{ course: Course }>(
      `/courses/${courseId}/archive`
    );
    return normalizeCourse(response.course)!;
  },

  /**
   * Restore an archived course
   */
  async restoreCourse(courseId: string): Promise<Course> {
    const response = await api.post<{ course: Course }>(
      `/courses/${courseId}/unarchive`
    );
    return normalizeCourse(response.course)!;
  },

  /**
   * Get next step - returns existing incomplete step or generates new one
   */
  async getNextStep(courseId: string): Promise<{ step: Step; stepIndex: number }> {
    const response = await api.post<{ step: Step; stepIndex: number }>(
      `/courses/${courseId}/next`
    );
    return response;
  },

  /**
   * Complete current step (legacy endpoint - completes first incomplete step)
   */
  async completeCurrentStep(
    courseId: string,
    data?: StepCompleteRequest
  ): Promise<{ course: Course; completedStep: Step; nextStepNeeded: boolean }> {
    const response = await api.post<{
      course: Course;
      completedStep: Step;
      nextStepNeeded: boolean;
    }>(`/courses/${courseId}/complete`, data || {});
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
  ): Promise<{ course: Course; completedStep: Step; nextStepNeeded: boolean }> {
    const response = await api.post<{
      course: Course;
      completedStep: Step;
      nextStepNeeded: boolean;
    }>(`/courses/${courseId}/steps/${stepId}/complete`, data || {});
    return {
      ...response,
      course: normalizeCourse(response.course)!,
    };
  },

  /**
   * View a step (records the view and updates lastReviewed in memory)
   */
  async viewStep(
    courseId: string,
    stepId: string
  ): Promise<{ success: boolean; step: Step }> {
    const response = await api.post<{ success: boolean; step: Step }>(
      `/courses/${courseId}/steps/${stepId}/view`
    );
    return response;
  },

  /**
   * Update memory for a topic in a specific course
   */
  async updateCourseMemory(
    courseId: string,
    memory: { topic: string; confidence: number; timesTested: number }
  ): Promise<void> {
    await api.post(`/courses/${courseId}/memory`, memory);
  },
};

/**
 * Context API types
 */
import {
  UserContext,
  ParsedContext,
  ContextUpdateResponse,
  DerivedContext,
} from '../types/app';

/**
 * Context API methods for user profile context
 */
export const contextApi = {
  /**
   * Get user's full context
   */
  async getContext(): Promise<UserContext | null> {
    try {
      const response = await api.get<{ context: UserContext }>('/context');
      return response.context;
    } catch (error) {
      // Return null if context doesn't exist yet
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Update context with new user input
   * Sends both previous context and new input for AI to merge
   */
  async updateContext(
    previousContext: ParsedContext,
    newInput: string
  ): Promise<ContextUpdateResponse> {
    const response = await api.put<ContextUpdateResponse>('/context/update', {
      previousContext,
      newInput,
    });
    return response;
  },

  /**
   * Apply confirmed context update
   */
  async applyContext(context: UserContext): Promise<void> {
    await api.put('/context', { context });
  },

  /**
   * Get derived context (auto-calculated from usage)
   */
  async getDerivedContext(): Promise<DerivedContext> {
    const response = await api.get<{ derived: DerivedContext }>('/context/derived');
    return response.derived;
  },

  /**
   * Get AI-ready context summary
   */
  async getContextSummary(): Promise<string> {
    const response = await api.get<{ summary: string }>('/context/summary');
    return response.summary;
  },
};

export default api;
