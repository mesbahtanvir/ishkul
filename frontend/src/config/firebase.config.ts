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
 */

export const firebaseConfig = {
  apiKey: "AIzaSyDC-AtXHpF7jZ1iLIpsvhM6zzGF8WCPHFM",
  authDomain: "ishkul-org.firebaseapp.com",
  projectId: "ishkul-org",
  storageBucket: "ishkul-org.firebasestorage.app",
  messagingSenderId: "863006625304",
  appId: "1:863006625304:web:6eb43a45a230bc5bf27d6d",
  measurementId: "G-RP26X5QB33"
};

/**
 * GCP Project configuration
 * Used to construct Cloud Run URLs for preview environments
 */
const GCP_PROJECT_NUMBER = "863006625304";
const GCP_REGION = "northamerica-northeast2";

/**
 * Get the API base URL based on environment
 *
 * Priority:
 * 1. Explicit EXPO_PUBLIC_API_URL environment variable
 * 2. Vercel preview with matching backend (auto-constructed URL)
 * 3. Production URL
 * 4. Localhost for development
 */
function getApiBaseUrl(): string {
  // 1. Explicit override always wins
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Vercel preview deployment - try to connect to matching backend preview
  // VERCEL_GIT_PULL_REQUEST_ID is set by Vercel for preview deployments
  const prNumber = process.env.VERCEL_GIT_PULL_REQUEST_ID;
  if (prNumber) {
    // Construct the Cloud Run preview URL
    // Format: https://{service-name}-{project-number}.{region}.run.app/api
    const previewUrl = `https://ishkul-backend-pr-${prNumber}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/api`;
    console.log(`[API Config] Preview detected (PR #${prNumber}), using: ${previewUrl}`);
    return previewUrl;
  }

  // 3. Production environment (Vercel production deployment)
  if (process.env.VERCEL_ENV === 'production') {
    return `https://ishkul-backend-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/api`;
  }

  // 4. Default to localhost for local development
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
export const isProduction = process.env.NODE_ENV === "production";
export const isPreview = !!process.env.VERCEL_GIT_PULL_REQUEST_ID;
