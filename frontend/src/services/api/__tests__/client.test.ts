import { apiClient, ApiError } from '../client';
import { tokenStorage } from '../tokenStorage';

// Mock dependencies
jest.mock('../tokenStorage', () => ({
  tokenStorage: {
    initialize: jest.fn().mockResolvedValue(undefined),
    hasTokens: jest.fn().mockReturnValue(true),
    getAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    getRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    isAccessTokenExpired: jest.fn().mockReturnValue(false),
    saveTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../config/firebase.config', () => ({
  apiConfig: {
    baseURL: 'https://api.test.com',
  },
}));

// Mock global fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('ApiError', () => {
    it('should create error with message and status', () => {
      const error = new ApiError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('Test error', 500);

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('request', () => {
    it('should make request with correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"data": "test"}'),
      } as Response);

      await apiClient.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.any(Object)
      );
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include Authorization header when token exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should skip auth when skipAuth is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.get('/test', { skipAuth: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    it('should parse JSON response', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(responseData)),
      } as Response);

      const result = await apiClient.get<typeof responseData>('/test');

      expect(result).toEqual(responseData);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response);

      const result = await apiClient.get('/test');

      expect(result).toEqual({});
    });

    it('should throw ApiError for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should throw ApiError for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status: 0,
      });
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      const data = { name: 'Test' };
      await apiClient.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should handle POST without body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('put', () => {
    it('should make PUT request with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      const data = { id: 1, name: 'Updated' };
      await apiClient.put('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      );
    });
  });

  describe('patch', () => {
    it('should make PATCH request with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      const data = { name: 'Patched' };
      await apiClient.patch('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      } as Response);

      await apiClient.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('token refresh', () => {
    it('should refresh token when expired', async () => {
      (tokenStorage.isAccessTokenExpired as jest.Mock).mockReturnValueOnce(
        true
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-token',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('{}'),
        } as Response);

      await apiClient.get('/test');

      expect(tokenStorage.saveTokens).toHaveBeenCalled();
    });

    it('should retry request after 401', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-token',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
          json: () => Promise.resolve({ success: true }),
        } as Response);

      const result = await apiClient.get<{ success: boolean }>('/test');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should throw 401 when refresh fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
