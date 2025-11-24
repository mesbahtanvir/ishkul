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
 * API Configuration
 * This will be automatically set during deployment
 */
export const apiConfig = {
  // Backend API URL - will be set during deployment
  // For local development, use: http://localhost:8080/api
  // For production, this will be your Cloud Run URL
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api",
};

/**
 * Environment helper
 */
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
