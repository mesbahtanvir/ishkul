import { apiClient, ApiError } from './client';
import { tokenStorage } from './tokenStorage';
import { User } from '../../types/app';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  firebaseToken: string; // Firebase custom token for real-time subscriptions
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

    // Save tokens (including Firebase token for real-time subscriptions)
    await tokenStorage.saveTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      firebaseToken: response.firebaseToken,
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
   * Login with email and password
   */
  async loginWithEmail(email: string, password: string): Promise<{ user: User; tokens: LoginResponse }> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login/email',
      { email, password },
      { skipAuth: true }
    );

    // Save tokens (including Firebase token for real-time subscriptions)
    await tokenStorage.saveTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      firebaseToken: response.firebaseToken,
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
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<{ user: User; tokens: LoginResponse }> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/register',
      { email, password, displayName },
      { skipAuth: true }
    );

    // Save tokens (including Firebase token for real-time subscriptions)
    await tokenStorage.saveTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      firebaseToken: response.firebaseToken,
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
   * Errors are propagated to the caller so they can notify the user
   */
  async logout(): Promise<void> {
    let logoutError: Error | null = null;

    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      // Capture error but don't throw yet - we still need to clear tokens
      logoutError = error instanceof Error ? error : new Error('Logout API call failed');
      console.error('Logout API call failed:', error);
    }

    // Always clear tokens, even if API call fails
    try {
      await tokenStorage.clearTokens();
    } catch (clearError) {
      console.error('Error clearing tokens during logout:', clearError);
      // If both API and token clearing failed, throw the API error first
      if (logoutError) throw logoutError;
      throw clearError;
    }

    // Now throw API error if it occurred (after tokens are cleared)
    if (logoutError) {
      throw logoutError;
    }
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

  /**
   * Get Firebase custom token (for real-time subscriptions)
   * This token is used to authenticate with Firebase client SDK
   */
  getFirebaseToken(): string | null {
    return tokenStorage.getFirebaseToken();
  },
};
