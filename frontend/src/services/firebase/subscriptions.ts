/**
 * Firestore Subscription Helpers
 *
 * Provides utilities for subscribing to Firestore documents
 * for real-time content updates during generation.
 */

import {
  doc,
  onSnapshot,
  DocumentSnapshot,
  FirestoreError,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreClient } from './index';
import { Course } from '../../types/app';

/**
 * Subscription error types
 */
export type SubscriptionErrorType =
  | 'permission-denied'
  | 'not-found'
  | 'unavailable'
  | 'unknown';

/**
 * Subscription error with additional context
 */
export interface SubscriptionError {
  type: SubscriptionErrorType;
  message: string;
  originalError?: FirestoreError;
}

/**
 * Callback types for subscriptions
 */
export type CourseUpdateCallback = (course: Course) => void;
export type ErrorCallback = (error: SubscriptionError) => void;

/**
 * Map Firestore error to friendly error type
 */
function mapFirestoreError(error: FirestoreError): SubscriptionError {
  switch (error.code) {
    case 'permission-denied':
      return {
        type: 'permission-denied',
        message: 'You do not have permission to access this content.',
        originalError: error,
      };
    case 'not-found':
      return {
        type: 'not-found',
        message: 'The requested content was not found.',
        originalError: error,
      };
    case 'unavailable':
      return {
        type: 'unavailable',
        message: 'Connection lost. Retrying...',
        originalError: error,
      };
    default:
      return {
        type: 'unknown',
        message: 'An unexpected error occurred.',
        originalError: error,
      };
  }
}

/**
 * Subscribe to a course document for real-time updates
 *
 * @param courseId - The ID of the course to subscribe to
 * @param onUpdate - Callback when the course document updates
 * @param onError - Callback when an error occurs
 * @returns Unsubscribe function
 *
 * @example
 * const unsubscribe = subscribeToCourse(
 *   courseId,
 *   (course) => updateCourseInStore(course),
 *   (error) => showNotification(error.message)
 * );
 *
 * // Later, to unsubscribe:
 * unsubscribe();
 */
export function subscribeToCourse(
  courseId: string,
  onUpdate: CourseUpdateCallback,
  onError?: ErrorCallback
): Unsubscribe {
  const db = getFirestoreClient();
  const courseRef = doc(db, 'courses', courseId);

  return onSnapshot(
    courseRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Course;
        // Ensure the ID is set (Firestore doesn't include it in data())
        const courseWithId: Course = {
          ...data,
          id: snapshot.id,
        };
        onUpdate(courseWithId);
      }
    },
    (error: FirestoreError) => {
      console.error('Course subscription error:', error);
      if (onError) {
        onError(mapFirestoreError(error));
      }
    }
  );
}

/**
 * Check if a course has any blocks still generating
 * Useful to determine if subscription should remain active
 */
export function hasPendingContent(course: Course | null): boolean {
  if (!course?.outline?.sections) {
    return false;
  }

  // Check outline status first
  if (course.outlineStatus === 'generating') {
    return true;
  }

  // Check all lessons for generating blocks
  for (const section of course.outline.sections) {
    for (const lesson of section.lessons || []) {
      // Check lesson-level blocks status
      if (lesson.blocksStatus === 'pending' || lesson.blocksStatus === 'generating') {
        return true;
      }

      // Check individual block content status
      const hasGeneratingBlocks = lesson.blocks?.some(
        (block) =>
          block.contentStatus === 'pending' || block.contentStatus === 'generating'
      );
      if (hasGeneratingBlocks) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if all content in a specific lesson is ready
 */
export function isLessonContentReady(
  course: Course | null,
  sectionId: string,
  lessonId: string
): boolean {
  if (!course?.outline?.sections) {
    return false;
  }

  const section = course.outline.sections.find((s) => s.id === sectionId);
  if (!section) {
    return false;
  }

  const lesson = section.lessons?.find((l) => l.id === lessonId);
  if (!lesson) {
    return false;
  }

  // Blocks must exist and be ready
  if (lesson.blocksStatus !== 'ready') {
    return false;
  }

  // All blocks must have content ready
  return lesson.blocks?.every(
    (block) => block.contentStatus === 'ready' || block.contentStatus === 'error'
  ) ?? false;
}
