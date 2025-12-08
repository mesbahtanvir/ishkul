/**
 * API Module Index
 *
 * Re-exports all API modules for convenient importing:
 *   import { authApi, coursesApi, lessonsApi } from '@/services/api';
 *
 * Module organization:
 *   - client.ts: Core HTTP client with auth handling
 *   - tokenStorage.ts: Token persistence layer
 *   - auth.ts: Authentication (login, logout, refresh)
 *   - user.ts: User profile and document management
 *   - courses.ts: Course CRUD and step operations
 *   - lessons.ts: 3-stage lesson content generation
 *   - context.ts: User learning context management
 */

// Core utilities
export { apiClient, ApiError } from './client';
export { tokenStorage } from './tokenStorage';
export type { TokenPair } from './tokenStorage';

// Domain APIs
export { authApi } from './auth';
export { userApi } from './user';
export { coursesApi } from './courses';
export { lessonsApi } from './lessons';
export { contextApi } from './context';
