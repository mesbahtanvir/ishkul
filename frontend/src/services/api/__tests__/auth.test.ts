/**
 * Tests for auth API service
 *
 * Tests authentication flows including:
 * - Google login
 * - Email login
 * - Registration
 * - Logout
 * - Auth state checking
 */

import { authApi, LoginResponse } from '../auth';
import { apiClient } from '../client';
import { tokenStorage } from '../tokenStorage';

// Mock the dependencies
jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('../tokenStorage', () => ({
  tokenStorage: {
    saveTokens: jest.fn(),
    clearTokens: jest.fn(),
    initialize: jest.fn(),
    hasTokens: jest.fn(),
    getAccessToken: jest.fn(),
    getFirebaseToken: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

// Helper to create mock login response
const createMockLoginResponse = (overrides: Partial<LoginResponse> = {}): LoginResponse => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  firebaseToken: 'mock-firebase-token',
  expiresIn: 3600,
  user: {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoUrl: 'https://example.com/photo.jpg',
  },
  ...overrides,
});

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenStorage.initialize.mockResolvedValue(undefined);
    mockTokenStorage.saveTokens.mockResolvedValue(undefined);
    mockTokenStorage.clearTokens.mockResolvedValue(undefined);
  });

  describe('loginWithGoogle', () => {
    it('should login with Google ID token', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.loginWithGoogle('google-id-token');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        { googleIdToken: 'google-id-token' },
        { skipAuth: true }
      );
      expect(result.user).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
      expect(result.tokens).toEqual(mockResponse);
    });

    it('should save tokens after login', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      await authApi.loginWithGoogle('google-id-token');

      expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        firebaseToken: 'mock-firebase-token',
        expiresIn: 3600,
      });
    });

    it('should handle user without photo URL', async () => {
      const mockResponse = createMockLoginResponse({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: undefined,
        },
      });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.loginWithGoogle('google-id-token');

      expect(result.user.photoURL).toBeNull();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(authApi.loginWithGoogle('google-id-token')).rejects.toThrow('Network error');
    });
  });

  describe('loginWithEmail', () => {
    it('should login with email and password', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.loginWithEmail('test@example.com', 'password123');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login/email',
        { email: 'test@example.com', password: 'password123' },
        { skipAuth: true }
      );
      expect(result.user.email).toBe('test@example.com');
    });

    it('should save tokens after email login', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      await authApi.loginWithEmail('test@example.com', 'password123');

      expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        firebaseToken: 'mock-firebase-token',
        expiresIn: 3600,
      });
    });

    it('should propagate invalid credentials error', async () => {
      const { ApiError } = require('../client');
      mockApiClient.post.mockRejectedValue(new ApiError('Invalid credentials', 401));

      await expect(authApi.loginWithEmail('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.register('new@example.com', 'password123', 'New User');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/register',
        { email: 'new@example.com', password: 'password123', displayName: 'New User' },
        { skipAuth: true }
      );
      expect(result.user.displayName).toBe('Test User'); // From mock response
    });

    it('should save tokens after registration', async () => {
      const mockResponse = createMockLoginResponse();
      mockApiClient.post.mockResolvedValue(mockResponse);

      await authApi.register('new@example.com', 'password123', 'New User');

      expect(mockTokenStorage.saveTokens).toHaveBeenCalled();
    });

    it('should propagate email already exists error', async () => {
      const { ApiError } = require('../client');
      mockApiClient.post.mockRejectedValue(new ApiError('Email already exists', 409));

      await expect(authApi.register('existing@example.com', 'password', 'User')).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', async () => {
      mockApiClient.post.mockResolvedValue({});

      await authApi.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', {});
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should clear tokens even if API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(authApi.logout()).rejects.toThrow('Network error');
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should throw if both API and token clearing fail', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API error'));
      mockTokenStorage.clearTokens.mockRejectedValue(new Error('Storage error'));

      await expect(authApi.logout()).rejects.toThrow('API error');
    });

    it('should throw storage error if only token clearing fails', async () => {
      mockApiClient.post.mockResolvedValue({});
      mockTokenStorage.clearTokens.mockRejectedValue(new Error('Storage error'));

      await expect(authApi.logout()).rejects.toThrow('Storage error');
    });
  });

  describe('checkAuth', () => {
    it('should return authenticated when user has valid tokens', async () => {
      mockTokenStorage.hasTokens.mockReturnValue(true);
      mockApiClient.get.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg',
      });

      const result = await authApi.checkAuth();

      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
    });

    it('should return not authenticated when no tokens', async () => {
      mockTokenStorage.hasTokens.mockReturnValue(false);

      const result = await authApi.checkAuth();

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should clear tokens and return not authenticated on 401', async () => {
      mockTokenStorage.hasTokens.mockReturnValue(true);
      const { ApiError } = require('../client');
      mockApiClient.get.mockRejectedValue(new ApiError('Unauthorized', 401));

      const result = await authApi.checkAuth();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should handle user without photo URL', async () => {
      mockTokenStorage.hasTokens.mockReturnValue(true);
      mockApiClient.get.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const result = await authApi.checkAuth();

      expect(result.user?.photoURL).toBeNull();
    });

    it('should return not authenticated on non-401 errors', async () => {
      mockTokenStorage.hasTokens.mockReturnValue(true);
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await authApi.checkAuth();

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(mockTokenStorage.clearTokens).not.toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize token storage', async () => {
      await authApi.initialize();

      expect(mockTokenStorage.initialize).toHaveBeenCalled();
    });
  });

  describe('hasTokens', () => {
    it('should return true when tokens exist', () => {
      mockTokenStorage.hasTokens.mockReturnValue(true);

      expect(authApi.hasTokens()).toBe(true);
    });

    it('should return false when no tokens', () => {
      mockTokenStorage.hasTokens.mockReturnValue(false);

      expect(authApi.hasTokens()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token', () => {
      mockTokenStorage.getAccessToken.mockReturnValue('test-token');

      expect(authApi.getAccessToken()).toBe('test-token');
    });

    it('should return null when no token', () => {
      mockTokenStorage.getAccessToken.mockReturnValue(null);

      expect(authApi.getAccessToken()).toBeNull();
    });
  });

  describe('getFirebaseToken', () => {
    it('should return Firebase token', () => {
      mockTokenStorage.getFirebaseToken.mockReturnValue('firebase-token');

      expect(authApi.getFirebaseToken()).toBe('firebase-token');
    });

    it('should return null when no token', () => {
      mockTokenStorage.getFirebaseToken.mockReturnValue(null);

      expect(authApi.getFirebaseToken()).toBeNull();
    });
  });
});
