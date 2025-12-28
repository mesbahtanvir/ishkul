/**
 * Firebase Client SDK Initialization
 *
 * This module initializes the Firebase client SDK for real-time subscriptions.
 * It provides access to Firestore for subscribing to course/lesson updates
 * during content generation.
 *
 * Note: All write operations still go through the backend API.
 * Firebase is used READ-ONLY for real-time subscriptions.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from '../../config/firebase.config';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase app (singleton pattern)
 * Safe to call multiple times - will return existing instance
 */
export function initializeFirebase(): FirebaseApp {
  if (app) {
    return app;
  }

  // Check if Firebase is already initialized (e.g., by another module)
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

/**
 * Get Firestore instance
 * Initializes Firebase if not already initialized
 */
export function getFirestoreClient(): Firestore {
  if (db) {
    return db;
  }

  const firebaseApp = initializeFirebase();
  db = getFirestore(firebaseApp);
  return db;
}

/**
 * Get Firebase Auth instance
 * Initializes Firebase if not already initialized
 */
export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }

  const firebaseApp = initializeFirebase();
  auth = getAuth(firebaseApp);
  return auth;
}

// Export for convenience
export { app, db, auth };
