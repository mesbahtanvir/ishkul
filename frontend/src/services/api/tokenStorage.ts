import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'ishkul_access_token';
const REFRESH_TOKEN_KEY = 'ishkul_refresh_token';
const FIREBASE_TOKEN_KEY = 'ishkul_firebase_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  firebaseToken?: string; // Firebase custom token for real-time subscriptions
  expiresIn: number;
}

class TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private firebaseToken: string | null = null;
  private expiresAt: number | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize token storage from persistent storage.
   * Safe to call multiple times - will only run once.
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: use localStorage
        this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        this.firebaseToken = localStorage.getItem(FIREBASE_TOKEN_KEY);
        const expiresAtStr = localStorage.getItem(`${ACCESS_TOKEN_KEY}_expires`);
        this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;
      } else {
        // Mobile: use AsyncStorage
        this.accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        this.refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        this.firebaseToken = await AsyncStorage.getItem(FIREBASE_TOKEN_KEY);
        const expiresAtStr = await AsyncStorage.getItem(`${ACCESS_TOKEN_KEY}_expires`);
        this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing token storage:', error);
      this.initialized = true; // Mark as initialized even on error to avoid retries
    }
  }

  /**
   * Check if token storage has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  async saveTokens(tokens: TokenPair): Promise<void> {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.firebaseToken = tokens.firebaseToken || null;
    this.expiresAt = Date.now() + tokens.expiresIn * 1000;

    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        localStorage.setItem(`${ACCESS_TOKEN_KEY}_expires`, this.expiresAt.toString());
        if (tokens.firebaseToken) {
          localStorage.setItem(FIREBASE_TOKEN_KEY, tokens.firebaseToken);
        }
      } else {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        await AsyncStorage.setItem(`${ACCESS_TOKEN_KEY}_expires`, this.expiresAt.toString());
        if (tokens.firebaseToken) {
          await AsyncStorage.setItem(FIREBASE_TOKEN_KEY, tokens.firebaseToken);
        }
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.firebaseToken = null;
    this.expiresAt = null;

    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(FIREBASE_TOKEN_KEY);
        localStorage.removeItem(`${ACCESS_TOKEN_KEY}_expires`);
      } else {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        await AsyncStorage.removeItem(FIREBASE_TOKEN_KEY);
        await AsyncStorage.removeItem(`${ACCESS_TOKEN_KEY}_expires`);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
      // Throw error so caller can handle it
      throw error;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getFirebaseToken(): string | null {
    return this.firebaseToken;
  }

  isAccessTokenExpired(): boolean {
    if (!this.expiresAt) return true;
    // Consider token expired 30 seconds before actual expiry
    return Date.now() >= this.expiresAt - 30000;
  }

  hasTokens(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }
}

export const tokenStorage = new TokenStorage();
