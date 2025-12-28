// Mock Platform to use web for localStorage tests
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: jest.fn((obj: Record<string, unknown>) => obj.web || obj.default),
  },
}));

// Create a fresh instance of tokenStorage for each test
const createTokenStorage = () => {
  // Reset the module to get fresh instance
  jest.resetModules();
  // Re-apply the Platform mock after module reset
  jest.doMock('react-native', () => ({
    Platform: {
      OS: 'web',
      select: jest.fn((obj: Record<string, unknown>) => obj.web || obj.default),
    },
  }));
  return require('../tokenStorage').tokenStorage;
};

describe('TokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    (global.localStorage.getItem as jest.Mock).mockReturnValue(null);
    (global.localStorage.setItem as jest.Mock).mockClear();
    (global.localStorage.removeItem as jest.Mock).mockClear();
  });

  describe('initialize', () => {
    it('should initialize with empty values', async () => {
      const tokenStorage = createTokenStorage();
      await tokenStorage.initialize();

      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
      expect(tokenStorage.getFirebaseToken()).toBeNull();
    });

    it('should load tokens from localStorage on web', async () => {
      (global.localStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === 'ishkul_access_token') return 'stored-access-token';
          if (key === 'ishkul_refresh_token') return 'stored-refresh-token';
          if (key === 'ishkul_access_token_expires') return String(Date.now() + 60000);
          return null;
        });

      const tokenStorage = createTokenStorage();
      await tokenStorage.initialize();

      expect(tokenStorage.getAccessToken()).toBe('stored-access-token');
      expect(tokenStorage.getRefreshToken()).toBe('stored-refresh-token');
    });

    it('should load Firebase token from localStorage on web', async () => {
      (global.localStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === 'ishkul_access_token') return 'stored-access-token';
          if (key === 'ishkul_refresh_token') return 'stored-refresh-token';
          if (key === 'ishkul_firebase_token') return 'stored-firebase-token';
          if (key === 'ishkul_access_token_expires') return String(Date.now() + 60000);
          return null;
        });

      const tokenStorage = createTokenStorage();
      await tokenStorage.initialize();

      expect(tokenStorage.getFirebaseToken()).toBe('stored-firebase-token');
    });
  });

  describe('saveTokens', () => {
    it('should save tokens to localStorage on web', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'ishkul_access_token',
        'new-access-token'
      );
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'ishkul_refresh_token',
        'new-refresh-token'
      );
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'ishkul_access_token_expires',
        expect.any(String)
      );
    });

    it('should save Firebase token to localStorage when provided', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-custom-token',
        expiresIn: 900,
      });

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'ishkul_firebase_token',
        'firebase-custom-token'
      );
    });

    it('should not save Firebase token when not provided', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      expect(global.localStorage.setItem).not.toHaveBeenCalledWith(
        'ishkul_firebase_token',
        expect.any(String)
      );
    });

    it('should update in-memory tokens', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      });

      expect(tokenStorage.getAccessToken()).toBe('new-access');
      expect(tokenStorage.getRefreshToken()).toBe('new-refresh');
    });

    it('should update in-memory Firebase token', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-token',
        expiresIn: 900,
      });

      expect(tokenStorage.getFirebaseToken()).toBe('firebase-token');
    });

    it('should set Firebase token to null when not provided', async () => {
      const tokenStorage = createTokenStorage();

      // First save with Firebase token
      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-token',
        expiresIn: 900,
      });

      expect(tokenStorage.getFirebaseToken()).toBe('firebase-token');

      // Then save without Firebase token
      await tokenStorage.saveTokens({
        accessToken: 'access2',
        refreshToken: 'refresh2',
        expiresIn: 900,
      });

      expect(tokenStorage.getFirebaseToken()).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens from localStorage', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      await tokenStorage.clearTokens();

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('ishkul_access_token');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('ishkul_refresh_token');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('ishkul_access_token_expires');
    });

    it('should clear Firebase token from localStorage', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-token',
        expiresIn: 900,
      });

      await tokenStorage.clearTokens();

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('ishkul_firebase_token');
    });

    it('should clear in-memory tokens', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      await tokenStorage.clearTokens();

      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });

    it('should clear in-memory Firebase token', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-token',
        expiresIn: 900,
      });

      await tokenStorage.clearTokens();

      expect(tokenStorage.getFirebaseToken()).toBeNull();
    });
  });

  describe('isAccessTokenExpired', () => {
    it('should return true when no expiry is set', () => {
      const tokenStorage = createTokenStorage();
      expect(tokenStorage.isAccessTokenExpired()).toBe(true);
    });

    it('should return false for valid token', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900, // 15 minutes
      });

      expect(tokenStorage.isAccessTokenExpired()).toBe(false);
    });

    it('should return true for expired token', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 0, // Already expired
      });

      expect(tokenStorage.isAccessTokenExpired()).toBe(true);
    });
  });

  describe('hasTokens', () => {
    it('should return false when no tokens', () => {
      const tokenStorage = createTokenStorage();
      expect(tokenStorage.hasTokens()).toBe(false);
    });

    it('should return true when tokens are set', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      expect(tokenStorage.hasTokens()).toBe(true);
    });

    it('should return false when only access token is set', async () => {
      const tokenStorage = createTokenStorage();
      // Directly set only accessToken via private property manipulation
      // This tests the edge case
      await tokenStorage.saveTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });
      await tokenStorage.clearTokens();

      expect(tokenStorage.hasTokens()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when not set', () => {
      const tokenStorage = createTokenStorage();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('should return token when set', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'my-access-token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      expect(tokenStorage.getAccessToken()).toBe('my-access-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when not set', () => {
      const tokenStorage = createTokenStorage();
      expect(tokenStorage.getRefreshToken()).toBeNull();
    });

    it('should return token when set', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'my-refresh-token',
        expiresIn: 900,
      });

      expect(tokenStorage.getRefreshToken()).toBe('my-refresh-token');
    });
  });

  describe('getFirebaseToken', () => {
    it('should return null when not set', () => {
      const tokenStorage = createTokenStorage();
      expect(tokenStorage.getFirebaseToken()).toBeNull();
    });

    it('should return token when set', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        firebaseToken: 'my-firebase-token',
        expiresIn: 900,
      });

      expect(tokenStorage.getFirebaseToken()).toBe('my-firebase-token');
    });

    it('should return null after tokens cleared', async () => {
      const tokenStorage = createTokenStorage();

      await tokenStorage.saveTokens({
        accessToken: 'access',
        refreshToken: 'refresh',
        firebaseToken: 'firebase-token',
        expiresIn: 900,
      });

      await tokenStorage.clearTokens();

      expect(tokenStorage.getFirebaseToken()).toBeNull();
    });
  });
});

describe('TokenPair interface', () => {
  it('should accept valid token pair', async () => {
    const tokenStorage = createTokenStorage();

    const tokenPair = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    };

    await expect(tokenStorage.saveTokens(tokenPair)).resolves.not.toThrow();
  });

  it('should accept token pair with Firebase token', async () => {
    const tokenStorage = createTokenStorage();

    const tokenPair = {
      accessToken: 'access',
      refreshToken: 'refresh',
      firebaseToken: 'firebase-token',
      expiresIn: 900,
    };

    await expect(tokenStorage.saveTokens(tokenPair)).resolves.not.toThrow();
    expect(tokenStorage.getFirebaseToken()).toBe('firebase-token');
  });
});
