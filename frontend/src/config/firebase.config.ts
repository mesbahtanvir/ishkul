/**
 * Firebase Configuration
 *
 * This file contains the Firebase configuration for the Ishkul app.
 * These values are safe to commit to version control as they are public-facing
 * identifiers used by the Firebase SDK.
 *
 * Security is handled by:
 * - Firestore Security Rules
 * - Storage Security Rules
 * - Firebase App Check (recommended for production)
 *
 * To get these values:
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Select your project
 * 3. Go to Project Settings > General
 * 4. Scroll to "Your apps" section
 * 5. Select your web app or create one
 * 6. Copy the config values
 *
 * For staging environment, set these environment variables:
 * - EXPO_PUBLIC_FIREBASE_API_KEY
 * - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - EXPO_PUBLIC_FIREBASE_PROJECT_ID
 * - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - EXPO_PUBLIC_FIREBASE_APP_ID
 * - EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
 */

// Production Firebase config (default)
const productionFirebaseConfig = {
  apiKey: "AIzaSyDC-AtXHpF7jZ1iLIpsvhM6zzGF8WCPHFM",
  authDomain: "ishkul-org.firebaseapp.com",
  projectId: "ishkul-org",
  storageBucket: "ishkul-org.firebasestorage.app",
  messagingSenderId: "863006625304",
  appId: "1:863006625304:web:6eb43a45a230bc5bf27d6d",
  measurementId: "G-RP26X5QB33"
};

// Get Firebase config from environment variables (for staging) or use production defaults
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || productionFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || productionFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || productionFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || productionFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || productionFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || productionFirebaseConfig.appId,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || productionFirebaseConfig.measurementId
};

/**
 * GCP Project configuration
 * Used to construct Cloud Run URLs for preview environments
 *
 * For staging, set EXPO_PUBLIC_GCP_PROJECT_NUMBER to the staging project number
 */
const GCP_PROJECT_NUMBER = process.env.EXPO_PUBLIC_GCP_PROJECT_NUMBER || "863006625304";
const GCP_REGION = "northamerica-northeast2";

/**
 * Backend service names
 */
const BACKEND_SERVICES = {
  production: 'ishkul-backend',
  staging: 'ishkul-backend-staging',
  preview: (prNumber: string) => `ishkul-backend-pr-${prNumber}`,
};

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
 * Get the API base URL based on environment
 *
 * Priority:
 * 1. Explicit EXPO_PUBLIC_API_URL environment variable
 * 2. Staging domain (staging.ishkul.org) → Staging backend
 * 3. Vercel preview with matching backend (auto-constructed URL)
 * 4. Production URL
 * 5. Localhost for development
 */
function getApiBaseUrl(): string {
  // 1. Explicit override always wins
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Staging domain detection (staging.ishkul.org)
  if (isStagingDomain()) {
    const stagingUrl = `https://${BACKEND_SERVICES.staging}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Staging domain detected, using: ${stagingUrl}`);
    return stagingUrl;
  }

  // 3. Vercel preview deployment - try to connect to matching backend preview
  // VERCEL_GIT_PULL_REQUEST_ID is set by Vercel for preview deployments
  const prNumber = process.env.VERCEL_GIT_PULL_REQUEST_ID;
  if (prNumber) {
    // Construct the Cloud Run preview URL
    // Format: https://{service-name}-{project-number}.{region}.run.app/api
    const previewUrl = `https://${BACKEND_SERVICES.preview(prNumber)}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Preview detected (PR #${prNumber}), using: ${previewUrl}`);
    return previewUrl;
  }

  // 4. Production environment (Vercel production deployment)
  if (process.env.VERCEL_ENV === 'production') {
    return `https://${BACKEND_SERVICES.production}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/api`;
  }

  // 5. Default to localhost for local development
  return "http://localhost:8080/api";
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
export const isDevelopment = process.env.NODE_ENV === "development";
export const isStaging = isStagingDomain();
export const isPreview = !!process.env.VERCEL_GIT_PULL_REQUEST_ID;
export const isProduction = process.env.NODE_ENV === "production" && !isStaging && !isPreview;
