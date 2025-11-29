import { apiClient, ApiError } from './client';
import { tokenStorage } from './tokenStorage';
import { User } from '../../types/app';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string;
    photoUrl?: string;
    goal?: string;
    level?: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export const authApi = {
  /**
   * Login with Google ID token
   * This exchanges the Google ID token for our session tokens
   */
  async loginWithGoogle(googleIdToken: string): Promise<{ user: User; tokens: LoginResponse }> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      { googleIdToken },
      { skipAuth: true }
    );

    // Save tokens
    await tokenStorage.saveTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    });

    // Map backend user to frontend User type
    const user: User = {
      uid: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      photoURL: response.user.photoUrl || null,
    };

    return { user, tokens: response };
  },

  /**
   * Logout - clear local tokens and notify backend
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      // Ignore errors - we still want to clear local tokens
      console.warn('Logout API call failed:', error);
    }
    await tokenStorage.clearTokens();
  },

  /**
   * Check if user is authenticated (has valid tokens)
   */
  async checkAuth(): Promise<AuthState> {
    await tokenStorage.initialize();

    if (!tokenStorage.hasTokens()) {
      return { user: null, isAuthenticated: false };
    }

    try {
      // Try to get current user to validate tokens
      const userData = await apiClient.get<{
        id: string;
        email: string;
        displayName: string;
        photoUrl?: string;
      }>('/me');

      const user: User = {
        uid: userData.id,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoUrl || null,
      };

      return { user, isAuthenticated: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Tokens are invalid
        await tokenStorage.clearTokens();
      }
      return { user: null, isAuthenticated: false };
    }
  },

  /**
   * Initialize auth state from storage
   */
  async initialize(): Promise<void> {
    await tokenStorage.initialize();
  },

  /**
   * Check if tokens exist
   */
  hasTokens(): boolean {
    return tokenStorage.hasTokens();
  },

  /**
   * Get current access token (for direct API calls)
   */
  getAccessToken(): string | null {
    return tokenStorage.getAccessToken();
  },
};
