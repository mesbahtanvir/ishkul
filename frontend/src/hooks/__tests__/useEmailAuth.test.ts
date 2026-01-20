/**
 * useEmailAuth Hook Tests
 *
 * Tests the email authentication hook including:
 * - Login mode
 * - Register mode
 * - Error handling
 * - Mode toggling
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEmailAuth, AuthMode } from '../useEmailAuth';
import { ApiError, ErrorCodes } from '../../services/api';

// Mock auth services
const mockSignInWithEmail = jest.fn();
const mockRegisterWithEmail = jest.fn();

jest.mock('../../services/auth', () => ({
  signInWithEmail: (email: string, password: string) =>
    mockSignInWithEmail(email, password),
  registerWithEmail: (email: string, password: string, displayName: string) =>
    mockRegisterWithEmail(email, password, displayName),
}));

// Mock user API
const mockGetUserDocument = jest.fn();

jest.mock('../../services/api', () => ({
  userApi: {
    getUserDocument: () => mockGetUserDocument(),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  ErrorCodes: {
    INVALID_EMAIL: 'INVALID_EMAIL',
    WEAK_PASSWORD: 'WEAK_PASSWORD',
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
}));

// Mock user store
const mockSetUser = jest.fn();
const mockSetUserDocument = jest.fn();
const mockSetLoading = jest.fn();

jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    setUser: mockSetUser,
    setUserDocument: mockSetUserDocument,
    setLoading: mockSetLoading,
  }),
}));

// Mock analytics
const mockTrackLogin = jest.fn().mockResolvedValue(undefined);
const mockTrackSignUp = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/analytics', () => ({
  useAnalytics: () => ({
    trackLogin: mockTrackLogin,
    trackSignUp: mockTrackSignUp,
  }),
}));

describe('useEmailAuth', () => {
  const mockOnSuccess = jest.fn();
  const mockUser = { uid: 'user-123', email: 'test@example.com' };
  const mockUserDoc = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithEmail.mockResolvedValue(mockUser);
    mockRegisterWithEmail.mockResolvedValue(mockUser);
    mockGetUserDocument.mockResolvedValue(mockUserDoc);
  });

  describe('Initial State', () => {
    it('should start in login mode', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      expect(result.current.authMode).toBe('login');
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.errors).toEqual({
        message: null,
        emailError: null,
        passwordError: null,
        nameError: null,
      });
    });
  });

  describe('Mode Toggle', () => {
    it('should toggle from login to register', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.toggleAuthMode();
      });

      expect(result.current.authMode).toBe('register');
    });

    it('should toggle from register to login', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.toggleAuthMode(); // login -> register
      });

      act(() => {
        result.current.toggleAuthMode(); // register -> login
      });

      expect(result.current.authMode).toBe('login');
    });

    it('should clear errors when toggling mode', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      // Set an error
      act(() => {
        result.current.setGeneralError('Some error');
      });

      expect(result.current.errors.message).toBe('Some error');

      // Toggle mode
      act(() => {
        result.current.toggleAuthMode();
      });

      expect(result.current.errors.message).toBe(null);
    });
  });

  describe('Error Management', () => {
    it('should set field error', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
      });

      expect(result.current.errors.emailError).toBe('Invalid email');
    });

    it('should set password error', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.setFieldError('password', 'Too short');
      });

      expect(result.current.errors.passwordError).toBe('Too short');
    });

    it('should set name error', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.setFieldError('name', 'Name required');
      });

      expect(result.current.errors.nameError).toBe('Name required');
    });

    it('should set general error', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.setGeneralError('Something went wrong');
      });

      expect(result.current.errors.message).toBe('Something went wrong');
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.setFieldError('email', 'Invalid');
        result.current.setFieldError('password', 'Weak');
        result.current.setGeneralError('Error');
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({
        message: null,
        emailError: null,
        passwordError: null,
        nameError: null,
      });
    });
  });

  describe('Login Flow', () => {
    it('should call signInWithEmail on login', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(success).toBe(true);
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should trim email on login', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('  test@example.com  ', 'password123');
      });

      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should track login event', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(mockTrackLogin).toHaveBeenCalledWith({ method: 'email' });
    });

    it('should set user and user document on successful login', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockSetUserDocument).toHaveBeenCalledWith(mockUserDoc);
    });

    it('should call onSuccess after successful login', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should set loading state during login', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      expect(result.current.isSubmitting).toBe(false);

      let resolveSignIn: (value: unknown) => void;
      mockSignInWithEmail.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const authPromise = result.current.handleAuth('test@example.com', 'password123');

      // Check loading started
      await waitFor(() => {
        expect(mockSetLoading).toHaveBeenCalledWith(true);
      });

      // Complete sign in
      await act(async () => {
        resolveSignIn!(mockUser);
        await authPromise;
      });

      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Register Flow', () => {
    it('should call registerWithEmail on register', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      // Switch to register mode
      act(() => {
        result.current.toggleAuthMode();
      });

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123', 'Test User');
      });

      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
    });

    it('should trim display name on register', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.toggleAuthMode();
      });

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123', '  Test User  ');
      });

      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
    });

    it('should handle empty display name', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.toggleAuthMode();
      });

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        ''
      );
    });

    it('should track sign up event', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      act(() => {
        result.current.toggleAuthMode();
      });

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123', 'Test');
      });

      expect(mockTrackSignUp).toHaveBeenCalledWith({ method: 'email' });
    });
  });

  describe('Error Handling', () => {
    it('should return false on error', async () => {
      mockSignInWithEmail.mockRejectedValue(new Error('Auth failed'));

      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      let success = true;
      await act(async () => {
        success = await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(success).toBe(false);
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should set general error for unknown errors', async () => {
      mockSignInWithEmail.mockRejectedValue(new Error('Unknown error'));

      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(result.current.errors.message).toBe('Unknown error');
    });

    it('should handle non-Error objects', async () => {
      mockSignInWithEmail.mockRejectedValue('string error');

      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(result.current.errors.message).toBe('Something went wrong. Please try again.');
    });

    it('should clear errors before new auth attempt', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      // Set an error
      act(() => {
        result.current.setGeneralError('Previous error');
      });

      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      // Error should be cleared (successful auth)
      expect(result.current.errors.message).toBe(null);
    });
  });

  describe('State Transitions', () => {
    it('should handle multiple auth attempts', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      // First attempt - success
      await act(async () => {
        await result.current.handleAuth('test1@example.com', 'password1');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);

      // Second attempt - success
      await act(async () => {
        await result.current.handleAuth('test2@example.com', 'password2');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(2);
    });

    it('should handle mode change between auth attempts', async () => {
      const { result } = renderHook(() => useEmailAuth(mockOnSuccess));

      // Login attempt
      await act(async () => {
        await result.current.handleAuth('test@example.com', 'password123');
      });

      expect(mockSignInWithEmail).toHaveBeenCalled();

      // Toggle to register
      act(() => {
        result.current.toggleAuthMode();
      });

      // Register attempt
      await act(async () => {
        await result.current.handleAuth('new@example.com', 'password456', 'New User');
      });

      expect(mockRegisterWithEmail).toHaveBeenCalled();
    });
  });
});
