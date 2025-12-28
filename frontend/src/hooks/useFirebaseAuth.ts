/**
 * useFirebaseAuth Hook
 *
 * Manages Firebase authentication lifecycle for real-time Firestore subscriptions.
 * This hook handles:
 * - Signing in to Firebase with custom tokens from the backend
 * - Signing out when the user logs out
 * - Tracking Firebase auth state
 */

import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithFirebaseToken,
  signOutFromFirebase,
  onFirebaseAuthStateChanged,
  isFirebaseAuthenticated,
} from '../services/firebase';

interface UseFirebaseAuthReturn {
  /** Whether Firebase is currently authenticated */
  isAuthenticated: boolean;
  /** Current Firebase user (if authenticated) */
  firebaseUser: User | null;
  /** Whether Firebase auth is initializing */
  isInitializing: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Sign in to Firebase with a custom token from the backend */
  signIn: (customToken: string) => Promise<boolean>;
  /** Sign out from Firebase */
  signOut: () => Promise<void>;
}

/**
 * Hook to manage Firebase authentication for real-time subscriptions
 *
 * @example
 * const { isAuthenticated, signIn, signOut, error } = useFirebaseAuth();
 *
 * // After backend login, sign in to Firebase
 * await signIn(loginResponse.firebaseToken);
 *
 * // When user logs out
 * await signOut();
 */
export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged((user) => {
      setFirebaseUser(user);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign in to Firebase using a custom token from the backend
   * @param customToken - The Firebase custom token from login response
   * @returns true if sign-in succeeded, false otherwise
   */
  const signIn = useCallback(async (customToken: string): Promise<boolean> => {
    if (!customToken) {
      // No token provided - this is not an error, just means Firebase subscriptions
      // won't be available and we'll fall back to polling
      return false;
    }

    try {
      setError(null);
      await signInWithFirebaseToken(customToken);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate with Firebase';
      console.error('Firebase sign-in error:', message);
      setError(message);
      return false;
    }
  }, []);

  /**
   * Sign out from Firebase
   * Should be called when the user logs out of the app
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await signOutFromFirebase();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out from Firebase';
      console.error('Firebase sign-out error:', message);
      // Don't set error on sign-out failure - it's not critical
    }
  }, []);

  return {
    isAuthenticated: isFirebaseAuthenticated(),
    firebaseUser,
    isInitializing,
    error,
    signIn,
    signOut,
  };
}
