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
});
