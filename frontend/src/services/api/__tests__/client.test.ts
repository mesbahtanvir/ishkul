import { ApiError, apiClient } from '../client';

// Mock tokenStorage
jest.mock('../tokenStorage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    hasTokens: jest.fn(),
    isAccessTokenExpired: jest.fn(),
    saveTokens: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

// Mock firebase.config
jest.mock('../../../config/firebase.config', () => ({
  apiConfig: {
    baseURL: 'http://localhost:8080/api',
  },
}));

import { tokenStorage } from '../tokenStorage';

describe('ApiError', () => {
  it('should create error with message and status', () => {
    const error = new ApiError('Not Found', 404);

    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('should be instance of Error', () => {
    const error = new ApiError('Error', 500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('request', () => {
    it('should make GET request without auth for skipAuth', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
        status: 200,
      });

      const result = await apiClient.get('/test', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should add Authorization header when token available', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(true);
      (tokenStorage.isAccessTokenExpired as jest.Mock).mockReturnValue(false);
      (tokenStorage.getAccessToken as jest.Mock).mockReturnValue('valid-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
        status: 200,
      });

      await apiClient.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('should throw ApiError on non-ok response', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Not Found'),
        status: 404,
      });

      await expect(apiClient.get('/notfound', { skipAuth: true })).rejects.toThrow(
        ApiError
      );
    });

    it('should handle empty response', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
        status: 200,
      });

      const result = await apiClient.get('/empty', { skipAuth: true });
      expect(result).toEqual({});
    });

    it('should throw ApiError on network error', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test', { skipAuth: true })).rejects.toThrow(
        ApiError
      );
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1 })),
        status: 200,
      });

      const result = await apiClient.get('/users/1', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ created: true })),
        status: 201,
      });

      const result = await apiClient.post('/users', { name: 'Test' }, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test' }),
        })
      );
      expect(result).toEqual({ created: true });
    });

    it('should make POST request without body', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
        status: 200,
      });

      await apiClient.post('/action', undefined, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/action',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('put', () => {
    it('should make PUT request with body', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ updated: true })),
        status: 200,
      });

      await apiClient.put('/users/1', { name: 'Updated' }, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
    });
  });

  describe('patch', () => {
    it('should make PATCH request with body', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ patched: true })),
        status: 200,
      });

      await apiClient.patch('/users/1', { name: 'Patched' }, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Patched' }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ deleted: true })),
        status: 200,
      });

      await apiClient.delete('/users/1', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('token refresh', () => {
    it('should refresh tokens when access token is expired', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(true);
      (tokenStorage.isAccessTokenExpired as jest.Mock).mockReturnValue(true);
      (tokenStorage.getRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (tokenStorage.getAccessToken as jest.Mock).mockReturnValue('new-access-token');
      (tokenStorage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      // First call for refresh
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 900,
            }),
          status: 200,
        })
        // Second call for actual request
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
          status: 200,
        });

      await apiClient.get('/protected');

      expect(tokenStorage.saveTokens).toHaveBeenCalled();
    });

    it('should handle 401 response by attempting refresh', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockReturnValue(true);
      (tokenStorage.isAccessTokenExpired as jest.Mock).mockReturnValue(false);
      (tokenStorage.getAccessToken as jest.Mock).mockReturnValue('old-token');
      (tokenStorage.getRefreshToken as jest.Mock).mockReturnValue('refresh-token');

      // First call returns 401
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Unauthorized'),
          status: 401,
        })
        // Refresh call
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-token',
              refreshToken: 'new-refresh',
              expiresIn: 900,
            }),
          status: 200,
        })
        // Retry call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
          status: 200,
        });

      (tokenStorage.getAccessToken as jest.Mock).mockReturnValue('new-token');

      const result = await apiClient.get('/protected');
      expect(result).toEqual({ success: true });
    });
  });
});
