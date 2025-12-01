import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { User } from '../types/app';
import { authApi } from './api';

// Required for Expo web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth config
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

/**
 * Generate the redirect URI for OAuth
 * - On web: uses the current origin (works for localhost and production)
 * - On native: uses the app's custom scheme from app.json
 *
 * IMPORTANT: The redirect URI MUST be registered in Google Cloud Console:
 * https://console.cloud.google.com/apis/credentials?project=ishkul-org
 *
 * Required URIs to add:
 * - Production: https://ishkul.vercel.app
 * - Development: http://localhost:19006
 */
const getRedirectUri = () => {
  const uri = makeRedirectUri({
    scheme: 'learningai',
    // On web, this uses window.location.origin
    // On native, this uses the scheme (learningai://)
  });

  // Always log the redirect URI to help with debugging
  console.log('[OAuth] Redirect URI:', uri);
  console.log('[OAuth] Add this URI to Google Cloud Console if not already added');

  return uri;
};

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
  const redirectUri = getRedirectUri();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri,
  });

  // Check if OAuth is configured
  const configError = getGoogleAuthConfigError();

  return { request, response, promptAsync, configError, redirectUri };
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
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const { user } = await authApi.loginWithEmail(email, password);
    return user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

/**
 * Register a new user with email and password
 */
export const registerWithEmail = async (email: string, password: string, displayName: string): Promise<User> => {
  try {
    const { user } = await authApi.register(email, password, displayName);
    return user;
  } catch (error) {
    console.error('Error registering:', error);
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
