/**
 * API Service Entry Point
 *
 * This file provides backward-compatible exports from the modular API structure.
 * For new code, prefer importing directly from '@/services/api':
 *
 *   import { authApi, coursesApi, lessonsApi } from '@/services/api';
 *
 * Module Structure:
 *   api/
 *   ├── client.ts      - Core HTTP client with auth handling
 *   ├── tokenStorage.ts - Token persistence layer
 *   ├── auth.ts        - Authentication (login, logout, refresh)
 *   ├── user.ts        - User profile and document management
 *   ├── courses.ts     - Course CRUD and step operations
 *   ├── lessons.ts     - 3-stage lesson content generation
 *   └── context.ts     - User learning context management
 */

// Re-export everything from the modular API
export {
  apiClient,
  ApiError,
  tokenStorage,
  authApi,
  userApi,
  coursesApi,
  lessonsApi,
  contextApi,
} from './api/index';

export type { TokenPair } from './api/index';

// =============================================================================
// Error Codes (kept for backward compatibility)
// =============================================================================

/**
 * Error codes from backend (kept in sync with backend/internal/handlers/auth.go)
 */
export const ErrorCodes = {
  // Authentication errors
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

  // Course errors
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  COURSE_ARCHIVED: 'COURSE_ARCHIVED',
  COURSE_DELETED: 'COURSE_DELETED',

  // Subscription limit errors
  COURSE_LIMIT_REACHED: 'COURSE_LIMIT_REACHED',
  DAILY_STEP_LIMIT_REACHED: 'DAILY_STEP_LIMIT_REACHED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Generic API Helper (backward compatibility)
// =============================================================================

import { apiClient } from './api/index';

/**
 * Generic API methods for custom endpoints.
 * Prefer using domain-specific APIs (coursesApi, lessonsApi, etc.) when available.
 */
export const api = {
  get: <T>(endpoint: string) => apiClient.get<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) => apiClient.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: unknown) => apiClient.put<T>(endpoint, data),
  patch: <T>(endpoint: string, data?: unknown) => apiClient.patch<T>(endpoint, data),
  delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint),
};

export default api;
