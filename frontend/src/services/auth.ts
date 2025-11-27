import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { User } from '../types/app';
import { authApi } from './api';

// Required for Expo web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth config
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

/**
 * Check if Google OAuth is properly configured
 * Returns true if at least one client ID is set
 */
export const isGoogleAuthConfigured = (): boolean => {
  return !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID);
};

/**
 * Get configuration error message for developers
 */
export const getGoogleAuthConfigError = (): string | null => {
  if (isGoogleAuthConfigured()) {
    return null;
  }
  return 'Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env.local file. See .env.example for reference.';
};

/**
 * Hook for Google OAuth authentication
 * Returns request, response, and promptAsync for use in components
 * Uses useIdTokenAuthRequest to get an ID token directly
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Check if OAuth is configured
  const configError = getGoogleAuthConfigError();

  return { request, response, promptAsync, configError };
};

/**
 * Sign in with Google ID token
 * This sends the Google ID token to our backend which validates it
 * and returns session tokens
 */
export const signInWithGoogleIdToken = async (idToken: string): Promise<User> => {
  try {
    const { user } = await authApi.loginWithGoogle(idToken);
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign out - clears local tokens and notifies backend
 */
export const signOut = async (): Promise<void> => {
  try {
    await authApi.logout();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Check authentication state
 * Returns the current user if authenticated, null otherwise
 */
export const checkAuthState = async (): Promise<User | null> => {
  try {
    const { user, isAuthenticated } = await authApi.checkAuth();
    return isAuthenticated ? user : null;
  } catch (error) {
    console.error('Error checking auth state:', error);
    return null;
  }
};

/**
 * Initialize auth - load tokens from storage
 */
export const initializeAuth = async (): Promise<void> => {
  await authApi.initialize();
};

/**
 * Check if user has stored tokens
 */
export const hasStoredTokens = (): boolean => {
  return authApi.hasTokens();
};
