import { apiConfig } from '../../config/firebase.config';
import { tokenStorage } from './tokenStorage';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = apiConfig.baseURL;
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await tokenStorage.clearTokens();
        return false;
      }

      const data = await response.json();
      await tokenStorage.saveTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      });
      return true;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      await tokenStorage.clearTokens();
      return false;
    }
  }

  private async ensureValidToken(): Promise<string | null> {
    if (!tokenStorage.hasTokens()) {
      return null;
    }

    if (tokenStorage.isAccessTokenExpired()) {
      // Prevent concurrent refresh calls
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshTokens().finally(() => {
          this.refreshPromise = null;
        });
      }

      const success = await this.refreshPromise;
      if (!success) {
        return null;
      }
    }

    return tokenStorage.getAccessToken();
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = await this.ensureValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 - try refresh once
      if (response.status === 401 && !skipAuth) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          const newToken = tokenStorage.getAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...fetchOptions,
              headers,
            });

            if (!retryResponse.ok) {
              const error = await retryResponse.text();
              throw new ApiError(error || 'Request failed', retryResponse.status);
            }

            return retryResponse.json();
          }
        }
        throw new ApiError('Unauthorized', 401);
      }

      if (!response.ok) {
        const error = await response.text();
        throw new ApiError(error || 'Request failed', response.status);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
