/**
 * Firebase Configuration
 *
 * Uses runtime domain detection to select the correct Firebase project.
 * This bypasses Vercel/Expo environment variable bundling issues.
 *
 * Environments:
 * - staging.ishkul.org → staging-ishkul-org Firebase project
 * - ishkul.org / localhost → ishkul-org Firebase project (production)
 *
 * Security is handled by:
 * - Firestore Security Rules
 * - Storage Security Rules
 * - Firebase App Check (recommended for production)
 */

/**
 * Get current hostname (works in browser, returns null in SSR/native)
 */
function getHostname(): string | null {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname;
  }
  return null;
}

/**
 * Check if running on staging domain
 */
function isStagingDomain(): boolean {
  const hostname = getHostname();
  return hostname === 'staging.ishkul.org';
}

/**
 * Check if running on production domain
 */
function isProductionDomain(): boolean {
  const hostname = getHostname();
  return hostname === 'ishkul.org' || hostname === 'www.ishkul.org';
}

/**
 * Staging Firebase Configuration (staging-ishkul-org project)
 */
const STAGING_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCfHGWYvXDuD-FKLSYzAdH-3WkRRu6_Cw4',
  authDomain: 'staging-ishkul-org.firebaseapp.com',
  projectId: 'staging-ishkul-org',
  storageBucket: 'staging-ishkul-org.firebasestorage.app',
  messagingSenderId: '930454644160',
  appId: '1:930454644160:web:c63069e1fe458b05909425',
  measurementId: 'G-WCQCKLRYGZ',
};

/**
 * Production Firebase Configuration (ishkul-org project)
 * Falls back to env vars for local development
 */
const PRODUCTION_FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Get Firebase config based on runtime domain detection
 */
function getFirebaseConfig() {
  const hostname = getHostname();

  // Staging domain -> use staging Firebase project
  if (isStagingDomain()) {
    console.log('[Firebase Config] Staging domain detected, using staging-ishkul-org project');
    return STAGING_FIREBASE_CONFIG;
  }

  // Production domain or localhost -> use production config (from env vars)
  console.log(`[Firebase Config] Using production config for hostname: ${hostname || 'unknown'}`);
  return PRODUCTION_FIREBASE_CONFIG;
}

// Export the Firebase config (determined at runtime)
export const firebaseConfig = getFirebaseConfig();

// Debug: Log the selected config
if (typeof window !== 'undefined') {
  console.log('[Firebase Config] Selected config:', {
    projectId: firebaseConfig.projectId,
    hasApiKey: !!firebaseConfig.apiKey,
    hostname: getHostname(),
  });
}

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

/**
 * GCP Project configuration
 * Used to construct Cloud Run URLs for preview environments
 */
const STAGING_GCP_PROJECT_NUMBER = '930454644160';
const PRODUCTION_GCP_PROJECT_NUMBER = '863006625304';
const GCP_REGION = 'northamerica-northeast2';

function getGcpProjectNumber(): string {
  if (isStagingDomain()) {
    return STAGING_GCP_PROJECT_NUMBER;
  }
  return process.env.EXPO_PUBLIC_GCP_PROJECT_NUMBER || PRODUCTION_GCP_PROJECT_NUMBER;
}

/**
 * Backend service names
 */
const BACKEND_SERVICES = {
  production: 'ishkul-backend',
  staging: 'ishkul-backend-staging',
  preview: (prNumber: string) => `ishkul-backend-pr-${prNumber}`,
};

/**
 * Get the API base URL based on environment
 *
 * Priority:
 * 1. Explicit EXPO_PUBLIC_API_URL environment variable
 * 2. Staging domain (staging.ishkul.org) -> Staging backend
 * 3. Production domain (ishkul.org) -> Production backend
 * 4. Vercel preview with matching backend (auto-constructed URL)
 * 5. Localhost for development
 */
function getApiBaseUrl(): string {
  const gcpProjectNumber = getGcpProjectNumber();

  // 1. Explicit override always wins
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('[API Config] Using explicit EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Staging domain detection (staging.ishkul.org)
  if (isStagingDomain()) {
    const stagingUrl = `https://${BACKEND_SERVICES.staging}-${gcpProjectNumber}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Staging domain detected, using: ${stagingUrl}`);
    return stagingUrl;
  }

  // 3. Production domain detection (ishkul.org)
  if (isProductionDomain()) {
    const prodUrl = `https://${BACKEND_SERVICES.production}-${gcpProjectNumber}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Production domain detected, using: ${prodUrl}`);
    return prodUrl;
  }

  // 4. Vercel preview deployment - try to connect to matching backend preview
  const prNumber = process.env.VERCEL_GIT_PULL_REQUEST_ID;
  if (prNumber) {
    const previewUrl = `https://${BACKEND_SERVICES.preview(prNumber)}-${gcpProjectNumber}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Preview detected (PR #${prNumber}), using: ${previewUrl}`);
    return previewUrl;
  }

  // 5. Vercel production environment
  if (process.env.VERCEL_ENV === 'production') {
    return `https://${BACKEND_SERVICES.production}-${gcpProjectNumber}.${GCP_REGION}.run.app/api`;
  }

  // 6. Default to localhost for local development
  console.log('[API Config] Using localhost for development');
  return 'http://localhost:8080/api';
}

/**
 * API Configuration
 * Automatically detects environment and sets appropriate backend URL
 */
export const apiConfig = {
  baseURL: getApiBaseUrl(),
};

/**
 * Environment helper
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isStaging = isStagingDomain();
export const isPreview = !!process.env.VERCEL_GIT_PULL_REQUEST_ID;
export const isProduction = process.env.NODE_ENV === 'production' && !isStaging && !isPreview;
