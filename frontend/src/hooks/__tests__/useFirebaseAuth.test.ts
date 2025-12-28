/**
 * Tests for useFirebaseAuth hook
 */

import { renderHook, act } from '@testing-library/react-native';

const mockUser = {
  uid: 'firebase-user-id',
  email: 'test@example.com',
};

const mockSignInWithFirebaseToken = jest.fn();
const mockSignOutFromFirebase = jest.fn();
const mockOnFirebaseAuthStateChanged = jest.fn();
const mockIsFirebaseAuthenticated = jest.fn();

jest.mock('../../services/firebase', () => ({
  signInWithFirebaseToken: (...args: unknown[]) => mockSignInWithFirebaseToken(...args),
  signOutFromFirebase: (...args: unknown[]) => mockSignOutFromFirebase(...args),
  onFirebaseAuthStateChanged: (...args: unknown[]) => mockOnFirebaseAuthStateChanged(...args),
  isFirebaseAuthenticated: () => mockIsFirebaseAuthenticated(),
}));

import { useFirebaseAuth } from '../useFirebaseAuth';

describe('useFirebaseAuth', () => {
  let authStateCallback: ((user: typeof mockUser | null) => void) | null = null;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;

    // Default mock implementations
    mockOnFirebaseAuthStateChanged.mockImplementation((callback) => {
      authStateCallback = callback;
      // Simulate initial call with null user
      callback(null);
      return mockUnsubscribe;
    });
    mockIsFirebaseAuthenticated.mockReturnValue(false);
    mockSignInWithFirebaseToken.mockResolvedValue(mockUser);
    mockSignOutFromFirebase.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should start with isInitializing true before auth state callback', () => {
      // Don't trigger the callback immediately
      mockOnFirebaseAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.isInitializing).toBe(true);
      expect(result.current.firebaseUser).toBeNull();
    });

    it('should set isInitializing to false after auth state callback', () => {
      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.isInitializing).toBe(false);
    });

    it('should subscribe to auth state changes on mount', () => {
      renderHook(() => useFirebaseAuth());

      expect(mockOnFirebaseAuthStateChanged).toHaveBeenCalledTimes(1);
      expect(mockOnFirebaseAuthStateChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe from auth state changes on unmount', () => {
      const { unmount } = renderHook(() => useFirebaseAuth());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should update firebaseUser when auth state changes', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      // Simulate user signing in
      act(() => {
        authStateCallback?.(mockUser);
      });

      expect(result.current.firebaseUser).toEqual(mockUser);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return true when authenticated', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('signIn', () => {
    it('should return false when no token provided', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signIn('');
      });

      expect(success).toBe(false);
      expect(mockSignInWithFirebaseToken).not.toHaveBeenCalled();
    });

    it('should call signInWithFirebaseToken with token', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signIn('custom-token-123');
      });

      expect(mockSignInWithFirebaseToken).toHaveBeenCalledWith('custom-token-123');
    });

    it('should return true on successful sign-in', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.signIn('custom-token-123');
      });

      expect(success).toBe(true);
    });

    it('should clear error on successful sign-in', async () => {
      mockSignInWithFirebaseToken.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useFirebaseAuth());

      // First sign-in fails
      await act(async () => {
        await result.current.signIn('bad-token');
      });

      expect(result.current.error).toBe('First error');

      // Second sign-in succeeds
      mockSignInWithFirebaseToken.mockResolvedValueOnce(mockUser);
      await act(async () => {
        await result.current.signIn('good-token');
      });

      expect(result.current.error).toBeNull();
    });

    it('should set error on sign-in failure', async () => {
      mockSignInWithFirebaseToken.mockRejectedValue(new Error('Authentication failed'));

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signIn('invalid-token');
      });

      expect(result.current.error).toBe('Authentication failed');
    });

    it('should return false on sign-in failure', async () => {
      mockSignInWithFirebaseToken.mockRejectedValue(new Error('Authentication failed'));

      const { result } = renderHook(() => useFirebaseAuth());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.signIn('invalid-token');
      });

      expect(success).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockSignInWithFirebaseToken.mockRejectedValue('string error');

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signIn('token');
      });

      expect(result.current.error).toBe('Failed to authenticate with Firebase');
    });
  });

  describe('signOut', () => {
    it('should call signOutFromFirebase', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOutFromFirebase).toHaveBeenCalledTimes(1);
    });

    it('should clear error before sign-out', async () => {
      mockSignInWithFirebaseToken.mockRejectedValue(new Error('Sign-in error'));

      const { result } = renderHook(() => useFirebaseAuth());

      // Create an error state
      await act(async () => {
        await result.current.signIn('bad-token');
      });

      expect(result.current.error).toBe('Sign-in error');

      // Sign out should clear error
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBeNull();
    });

    it('should not set error on sign-out failure', async () => {
      mockSignOutFromFirebase.mockRejectedValue(new Error('Sign-out failed'));

      const { result } = renderHook(() => useFirebaseAuth());

      await act(async () => {
        await result.current.signOut();
      });

      // Error should not be set for sign-out failures
      expect(result.current.error).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should handle transition from unauthenticated to authenticated', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.firebaseUser).toBeNull();

      // Simulate user signing in via auth state change
      act(() => {
        authStateCallback?.(mockUser);
      });

      expect(result.current.firebaseUser).toEqual(mockUser);
    });

    it('should handle transition from authenticated to unauthenticated', async () => {
      // Start with authenticated user
      mockOnFirebaseAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        callback(mockUser);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirebaseAuth());

      expect(result.current.firebaseUser).toEqual(mockUser);

      // Simulate user signing out
      act(() => {
        authStateCallback?.(null);
      });

      expect(result.current.firebaseUser).toBeNull();
    });

    it('should handle rapid sign-in attempts', async () => {
      const { result } = renderHook(() => useFirebaseAuth());

      // Multiple rapid sign-in attempts
      await act(async () => {
        const promises = [
          result.current.signIn('token-1'),
          result.current.signIn('token-2'),
          result.current.signIn('token-3'),
        ];
        await Promise.all(promises);
      });

      expect(mockSignInWithFirebaseToken).toHaveBeenCalledTimes(3);
    });
  });
});
