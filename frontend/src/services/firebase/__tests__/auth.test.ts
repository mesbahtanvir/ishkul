/**
 * Tests for Firebase auth service
 */

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
};

const mockAuth = {
  currentUser: null as typeof mockUser | null,
};

const mockUnsubscribe = jest.fn();

jest.mock('firebase/auth', () => ({
  signInWithCustomToken: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(auth.currentUser);
    return mockUnsubscribe;
  }),
}));

jest.mock('../index', () => ({
  getFirebaseAuth: jest.fn(() => mockAuth),
}));

describe('Firebase auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = null;
  });

  describe('signInWithFirebaseToken', () => {
    it('should sign in with custom token and return user', async () => {
      const { signInWithCustomToken } = require('firebase/auth');
      const { signInWithFirebaseToken } = require('../auth');

      (signInWithCustomToken as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      const user = await signInWithFirebaseToken('custom-token-123');

      expect(signInWithCustomToken).toHaveBeenCalledWith(mockAuth, 'custom-token-123');
      expect(user).toEqual(mockUser);
    });

    it('should throw error on invalid token', async () => {
      const { signInWithCustomToken } = require('firebase/auth');
      const { signInWithFirebaseToken } = require('../auth');

      const error = new Error('Invalid token');
      (signInWithCustomToken as jest.Mock).mockRejectedValue(error);

      await expect(signInWithFirebaseToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('signOutFromFirebase', () => {
    it('should sign out from Firebase', async () => {
      const { signOut } = require('firebase/auth');
      const { signOutFromFirebase } = require('../auth');

      await signOutFromFirebase();

      expect(signOut).toHaveBeenCalledWith(mockAuth);
    });

    it('should throw error on sign out failure', async () => {
      const { signOut } = require('firebase/auth');
      const { signOutFromFirebase } = require('../auth');

      const error = new Error('Sign out failed');
      (signOut as jest.Mock).mockRejectedValue(error);

      await expect(signOutFromFirebase()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentFirebaseUser', () => {
    it('should return null when no user is authenticated', () => {
      mockAuth.currentUser = null;
      const { getCurrentFirebaseUser } = require('../auth');

      const user = getCurrentFirebaseUser();

      expect(user).toBeNull();
    });

    it('should return current user when authenticated', () => {
      mockAuth.currentUser = mockUser;
      const { getCurrentFirebaseUser } = require('../auth');

      const user = getCurrentFirebaseUser();

      expect(user).toEqual(mockUser);
    });
  });

  describe('isFirebaseAuthenticated', () => {
    it('should return false when no user', () => {
      mockAuth.currentUser = null;
      const { isFirebaseAuthenticated } = require('../auth');

      expect(isFirebaseAuthenticated()).toBe(false);
    });

    it('should return true when user exists', () => {
      mockAuth.currentUser = mockUser;
      const { isFirebaseAuthenticated } = require('../auth');

      expect(isFirebaseAuthenticated()).toBe(true);
    });
  });

  describe('onFirebaseAuthStateChanged', () => {
    it('should subscribe to auth state changes', () => {
      const { onAuthStateChanged } = require('firebase/auth');
      const { onFirebaseAuthStateChanged } = require('../auth');

      const callback = jest.fn();
      const unsubscribe = onFirebaseAuthStateChanged(callback);

      expect(onAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call callback with current user', () => {
      mockAuth.currentUser = mockUser;
      jest.resetModules();

      // Re-mock with updated auth state
      jest.doMock('firebase/auth', () => ({
        onAuthStateChanged: jest.fn((auth, callback) => {
          callback(mockUser);
          return mockUnsubscribe;
        }),
      }));

      const { onFirebaseAuthStateChanged } = require('../auth');
      const callback = jest.fn();

      onFirebaseAuthStateChanged(callback);

      expect(callback).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getFirebaseIdToken', () => {
    it('should return null when no user', async () => {
      mockAuth.currentUser = null;
      const { getFirebaseIdToken } = require('../auth');

      const token = await getFirebaseIdToken();

      expect(token).toBeNull();
    });

    it('should return ID token when authenticated', async () => {
      mockAuth.currentUser = mockUser;
      const { getFirebaseIdToken } = require('../auth');

      const token = await getFirebaseIdToken();

      expect(mockUser.getIdToken).toHaveBeenCalled();
      expect(token).toBe('mock-id-token');
    });
  });
});
