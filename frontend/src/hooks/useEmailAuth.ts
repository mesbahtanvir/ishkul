/**
 * useEmailAuth Hook
 *
 * Handles email/password authentication logic (login and registration).
 * Separates authentication concerns from UI rendering for better testability.
 */

import { useState, useCallback } from 'react';
import { useUserStore } from '../state/userStore';
import {
  signInWithEmail,
  registerWithEmail,
} from '../services/auth';
import { userApi, ApiError, ErrorCodes } from '../services/api';
import { useAnalytics } from '../services/analytics';

// =============================================================================
// Types
// =============================================================================

export type AuthMode = 'login' | 'register';

export interface AuthError {
  message: string | null;
  emailError: string | null;
  passwordError: string | null;
  nameError: string | null;
}

export interface UseEmailAuthResult {
  /** Current authentication mode */
  authMode: AuthMode;
  /** Toggle between login and register modes */
  toggleAuthMode: () => void;
  /** Whether an auth operation is in progress */
  isSubmitting: boolean;
  /** Current error state */
  errors: AuthError;
  /** Clear all errors */
  clearErrors: () => void;
  /** Set a specific field error */
  setFieldError: (field: 'email' | 'password' | 'name', error: string | null) => void;
  /** Set the general error message */
  setGeneralError: (message: string | null) => void;
  /** Handle email/password authentication */
  handleAuth: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<boolean>;
}

// =============================================================================
// Initial State
// =============================================================================

const initialErrors: AuthError = {
  message: null,
  emailError: null,
  passwordError: null,
  nameError: null,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useEmailAuth(onSuccess: () => void): UseEmailAuthResult {
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { trackSignUp, trackLogin } = useAnalytics();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AuthError>(initialErrors);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors(initialErrors);
  }, []);

  // Set a specific field error
  const setFieldError = useCallback(
    (field: 'email' | 'password' | 'name', error: string | null) => {
      setErrors((prev) => ({
        ...prev,
        [`${field}Error`]: error,
      }));
    },
    []
  );

  // Set the general error message
  const setGeneralError = useCallback((message: string | null) => {
    setErrors((prev) => ({
      ...prev,
      message,
    }));
  }, []);

  // Toggle between login and register modes
  const toggleAuthMode = useCallback(() => {
    setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
    clearErrors();
  }, [clearErrors]);

  // Handle authentication
  const handleAuth = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string
    ): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setLoading(true);
        clearErrors();

        let user;
        if (authMode === 'login') {
          user = await signInWithEmail(email.trim(), password);
          await trackLogin({ method: 'email' });
        } else {
          user = await registerWithEmail(
            email.trim(),
            password,
            displayName?.trim() || ''
          );
          await trackSignUp({ method: 'email' });
        }

        setUser(user);
        const userDoc = await userApi.getUserDocument();
        setUserDocument(userDoc);

        onSuccess();
        return true;
      } catch (error) {
        console.error('Email auth error:', error);
        handleAuthError(error);
        return false;
      } finally {
        setIsSubmitting(false);
        setLoading(false);
      }
    },
    [
      authMode,
      setUser,
      setUserDocument,
      setLoading,
      trackLogin,
      trackSignUp,
      onSuccess,
      clearErrors,
    ]
  );

  // Handle authentication errors
  const handleAuthError = (error: unknown) => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case ErrorCodes.INVALID_EMAIL:
          setErrors((prev) => ({ ...prev, emailError: error.message }));
          break;
        case ErrorCodes.WEAK_PASSWORD:
          setErrors((prev) => ({ ...prev, passwordError: error.message }));
          break;
        case ErrorCodes.EMAIL_EXISTS:
        case ErrorCodes.INVALID_CREDENTIALS:
        case ErrorCodes.TOO_MANY_REQUESTS:
        case ErrorCodes.NETWORK_ERROR:
        default:
          setErrors((prev) => ({ ...prev, message: error.message }));
          break;
      }
    } else if (error instanceof Error) {
      setErrors((prev) => ({ ...prev, message: error.message }));
    } else {
      setErrors((prev) => ({
        ...prev,
        message: 'Something went wrong. Please try again.',
      }));
    }
  };

  return {
    authMode,
    toggleAuthMode,
    isSubmitting,
    errors,
    clearErrors,
    setFieldError,
    setGeneralError,
    handleAuth,
  };
}
