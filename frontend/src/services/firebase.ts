/**
 * Firebase Service - Re-exports
 *
 * This file re-exports Firebase functionality from the new modular structure.
 *
 * Firebase SDK is now used for:
 * - Real-time Firestore subscriptions during content generation
 * - Firebase Auth (synced with backend custom tokens)
 *
 * Write operations still go through the backend API.
 */

// Re-export from new modular structure
export {
  initializeFirebase,
  getFirestoreClient,
  getFirebaseAuth,
} from './firebase/index';

export {
  signInWithFirebaseToken,
  signOutFromFirebase,
  getCurrentFirebaseUser,
  isFirebaseAuthenticated,
  onFirebaseAuthStateChanged,
} from './firebase/auth';

export {
  subscribeToCourse,
  subscribeToUserCourses,
  hasPendingContent,
  isLessonContentReady,
  type SubscriptionError,
  type SubscriptionErrorType,
} from './firebase/subscriptions';
