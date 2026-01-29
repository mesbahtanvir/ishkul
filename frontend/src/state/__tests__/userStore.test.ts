/**
 * Tests for userStore
 *
 * Tests the user management store including:
 * - User state management
 * - User document handling
 * - Loading and error states
 * - Store persistence
 */

import { act } from '@testing-library/react-native';
import { useUserStore } from '../userStore';
import { User, UserDocument } from '../../types/app';

// Helper to create a mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  uid: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  ...overrides,
});

// Helper to create a mock user document
const createMockUserDocument = (overrides: Partial<UserDocument> = {}): UserDocument => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  tier: 'free',
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  lastLoginAt: Date.now(),
  ...overrides,
});

describe('userStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useUserStore.getState().clearUser();
      useUserStore.setState({
        loading: false,
        error: null,
        _hasHydrated: 0,
      });
    });
  });

  describe('initial state', () => {
    it('should start with null user', () => {
      const { user } = useUserStore.getState();
      expect(user).toBeNull();
    });

    it('should start with null userDocument', () => {
      const { userDocument } = useUserStore.getState();
      expect(userDocument).toBeNull();
    });

    it('should start with loading false after reset', () => {
      const { loading } = useUserStore.getState();
      expect(loading).toBe(false);
    });

    it('should start with null error', () => {
      const { error } = useUserStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      const mockUser = createMockUser();

      act(() => {
        useUserStore.getState().setUser(mockUser);
      });

      const { user } = useUserStore.getState();
      expect(user).toEqual(mockUser);
    });

    it('should set user to null', () => {
      const mockUser = createMockUser();

      act(() => {
        useUserStore.getState().setUser(mockUser);
        useUserStore.getState().setUser(null);
      });

      const { user } = useUserStore.getState();
      expect(user).toBeNull();
    });

    it('should update user with new values', () => {
      const mockUser = createMockUser({ displayName: 'Original Name' });

      act(() => {
        useUserStore.getState().setUser(mockUser);
      });

      const updatedUser = createMockUser({ ...mockUser, displayName: 'Updated Name' });

      act(() => {
        useUserStore.getState().setUser(updatedUser);
      });

      const { user } = useUserStore.getState();
      expect(user?.displayName).toBe('Updated Name');
    });
  });

  describe('setUserDocument', () => {
    it('should set userDocument', () => {
      const mockDoc = createMockUserDocument();

      act(() => {
        useUserStore.getState().setUserDocument(mockDoc);
      });

      const { userDocument } = useUserStore.getState();
      expect(userDocument).toEqual(mockDoc);
    });

    it('should set userDocument to null', () => {
      const mockDoc = createMockUserDocument();

      act(() => {
        useUserStore.getState().setUserDocument(mockDoc);
        useUserStore.getState().setUserDocument(null);
      });

      const { userDocument } = useUserStore.getState();
      expect(userDocument).toBeNull();
    });

    it('should handle userDocument with premium tier', () => {
      const mockDoc = createMockUserDocument({ tier: 'premium' });

      act(() => {
        useUserStore.getState().setUserDocument(mockDoc);
      });

      const { userDocument } = useUserStore.getState();
      expect(userDocument?.tier).toBe('premium');
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      act(() => {
        useUserStore.getState().setLoading(true);
      });

      const { loading } = useUserStore.getState();
      expect(loading).toBe(true);
    });

    it('should set loading to false', () => {
      act(() => {
        useUserStore.getState().setLoading(true);
        useUserStore.getState().setLoading(false);
      });

      const { loading } = useUserStore.getState();
      expect(loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      act(() => {
        useUserStore.getState().setError('Something went wrong');
      });

      const { error } = useUserStore.getState();
      expect(error).toBe('Something went wrong');
    });

    it('should clear error with null', () => {
      act(() => {
        useUserStore.getState().setError('Something went wrong');
        useUserStore.getState().setError(null);
      });

      const { error } = useUserStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('clearUser', () => {
    it('should clear user and userDocument', () => {
      const mockUser = createMockUser();
      const mockDoc = createMockUserDocument();

      act(() => {
        useUserStore.getState().setUser(mockUser);
        useUserStore.getState().setUserDocument(mockDoc);
        useUserStore.getState().clearUser();
      });

      const { user, userDocument, error } = useUserStore.getState();
      expect(user).toBeNull();
      expect(userDocument).toBeNull();
      expect(error).toBeNull();
    });

    it('should not affect loading state', () => {
      act(() => {
        useUserStore.getState().setLoading(true);
        useUserStore.getState().clearUser();
      });

      const { loading } = useUserStore.getState();
      expect(loading).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should handle login flow: loading -> user set -> loading complete', () => {
      const mockUser = createMockUser();
      const mockDoc = createMockUserDocument();

      // Start loading
      act(() => {
        useUserStore.getState().setLoading(true);
      });
      expect(useUserStore.getState().loading).toBe(true);

      // Set user
      act(() => {
        useUserStore.getState().setUser(mockUser);
      });
      expect(useUserStore.getState().user).toEqual(mockUser);

      // Set document
      act(() => {
        useUserStore.getState().setUserDocument(mockDoc);
      });
      expect(useUserStore.getState().userDocument).toEqual(mockDoc);

      // Complete loading
      act(() => {
        useUserStore.getState().setLoading(false);
      });
      expect(useUserStore.getState().loading).toBe(false);
    });

    it('should handle logout flow: user exists -> clearUser', () => {
      const mockUser = createMockUser();
      const mockDoc = createMockUserDocument();

      // Setup logged in state
      act(() => {
        useUserStore.getState().setUser(mockUser);
        useUserStore.getState().setUserDocument(mockDoc);
        useUserStore.getState().setLoading(false);
      });

      // Verify logged in
      expect(useUserStore.getState().user).toEqual(mockUser);
      expect(useUserStore.getState().userDocument).toEqual(mockDoc);

      // Logout
      act(() => {
        useUserStore.getState().clearUser();
      });

      // Verify logged out
      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().userDocument).toBeNull();
    });

    it('should handle error flow: loading -> error -> clear error', () => {
      // Start loading
      act(() => {
        useUserStore.getState().setLoading(true);
      });

      // Error occurs
      act(() => {
        useUserStore.getState().setError('Network error');
        useUserStore.getState().setLoading(false);
      });

      expect(useUserStore.getState().error).toBe('Network error');
      expect(useUserStore.getState().loading).toBe(false);

      // Retry - clear error
      act(() => {
        useUserStore.getState().setError(null);
        useUserStore.getState().setLoading(true);
      });

      expect(useUserStore.getState().error).toBeNull();
      expect(useUserStore.getState().loading).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle user with minimal data', () => {
      const minimalUser: User = {
        uid: 'user-123',
        email: null,
        displayName: null,
        photoURL: null,
      };

      act(() => {
        useUserStore.getState().setUser(minimalUser);
      });

      const { user } = useUserStore.getState();
      expect(user?.uid).toBe('user-123');
      expect(user?.email).toBeNull();
    });

    it('should handle rapid state changes', () => {
      const users = Array.from({ length: 5 }, (_, i) =>
        createMockUser({ uid: `user-${i}` })
      );

      act(() => {
        users.forEach((u) => {
          useUserStore.getState().setUser(u);
        });
      });

      // Should have the last user
      const { user } = useUserStore.getState();
      expect(user?.uid).toBe('user-4');
    });
  });
});
