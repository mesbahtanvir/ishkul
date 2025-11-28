import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/firebase.config';
import { User, UserDocument } from '../types/app';

// Storage keys for tokens
const ACCESS_TOKEN_KEY = '@ishkul/accessToken';
const REFRESH_TOKEN_KEY = '@ishkul/refreshToken';
const USER_KEY = '@ishkul/user';

// Token state (in-memory cache for quick access)
let accessToken: string | null = null;
let refreshToken: string | null = null;

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
  const url = `${apiConfig.baseURL}${endpoint}`;

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
  if (response.status === 401 && refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
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
    await clearTokens();
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
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${apiConfig.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data: RefreshResponse = await response.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Store tokens in memory and persistent storage
 */
async function storeTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;

  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, access],
    [REFRESH_TOKEN_KEY, refresh],
  ]);
}

/**
 * Store user in persistent storage
 */
async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear all tokens and user data
 */
async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;

  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}

/**
 * Load tokens from persistent storage into memory
 */
async function loadTokensFromStorage(): Promise<void> {
  try {
    const [[, storedAccessToken], [, storedRefreshToken]] =
      await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);

    accessToken = storedAccessToken;
    refreshToken = storedRefreshToken;
  } catch (error) {
    console.error('Error loading tokens from storage:', error);
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
    await loadTokensFromStorage();
  },

  /**
   * Check if user has stored tokens
   */
  hasTokens(): boolean {
    return !!(accessToken && refreshToken);
  },

  /**
   * Get current access token (for manual use if needed)
   */
  getAccessToken(): string | null {
    return accessToken;
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

    // Store tokens and user
    await storeTokens(data.accessToken, data.refreshToken);

    // Convert backend user to frontend user format
    const user: User = {
      uid: data.user.uid || (data.user as unknown as { id: string }).id,
      email: data.user.email,
      displayName: data.user.displayName,
      photoURL: data.user.photoURL,
    };

    await storeUser(user);

    return { user };
  },

  /**
   * Logout - clear local tokens and notify backend
   */
  async logout(): Promise<void> {
    try {
      // Notify backend (ignore errors - we're logging out anyway)
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
      await clearTokens();
    }
  },

  /**
   * Check authentication state
   * Returns the current user if tokens are valid
   */
  async checkAuth(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    // No tokens - not authenticated
    if (!accessToken || !refreshToken) {
      return { user: null, isAuthenticated: false };
    }

    // If we have a cached user, try to validate by making a request
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

      await storeUser(user);
      return { user, isAuthenticated: true };
    } catch {
      // Token validation failed
      await clearTokens();
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

export default api;
