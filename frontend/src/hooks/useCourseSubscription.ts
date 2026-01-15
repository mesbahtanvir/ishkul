/**
 * useCourseSubscription Hook
 *
 * Subscribes to a course document in Firestore for real-time updates
 * during content generation. This enables progressive block rendering
 * where blocks are displayed one-by-one as they become ready.
 *
 * The subscription is automatically managed:
 * - Activates when content is generating (blocks in pending/generating state)
 * - Deactivates when all content is ready
 * - Falls back gracefully if Firebase is not authenticated
 */

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useCoursesStore } from '../state/coursesStore';
import {
  subscribeToCourse,
  hasPendingContent,
  isFirebaseAuthenticated,
  SubscriptionError,
} from '../services/firebase';
import { Course } from '../types/app';

// Use useLayoutEffect on client, useEffect on server (SSR-safe)
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface UseCourseSubscriptionOptions {
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Callback when connection error occurs */
  onError?: (error: SubscriptionError) => void;
}

interface UseCourseSubscriptionReturn {
  /** Whether the subscription is currently active */
  isSubscribed: boolean;
  /** Connection error message, if any */
  connectionError: string | null;
  /** Whether there's still content generating */
  hasGeneratingContent: boolean;
}

/**
 * Hook to subscribe to a course document for real-time updates
 *
 * @param courseId - The ID of the course to subscribe to
 * @param options - Configuration options
 *
 * @example
 * // In LessonScreen or CourseViewScreen
 * const { connectionError, hasGeneratingContent } = useCourseSubscription(courseId);
 *
 * // Show notification on connection error
 * useEffect(() => {
 *   if (connectionError) {
 *     showToast({ type: 'warning', message: connectionError });
 *   }
 * }, [connectionError]);
 */
export function useCourseSubscription(
  courseId: string | null | undefined,
  options: UseCourseSubscriptionOptions = {}
): UseCourseSubscriptionReturn {
  const { enabled = true, onError } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Get the course from store to check if it needs subscription
  const course = useCoursesStore((state) =>
    state.courses.find((c) => c.id === courseId) || state.activeCourse
  );
  const updateCourse = useCoursesStore((state) => state.updateCourse);

  // Track if we should be subscribed based on content status
  const shouldSubscribe = useCallback((courseData: Course | null): boolean => {
    if (!courseData) return false;
    return hasPendingContent(courseData);
  }, []);

  // Check if there's generating content
  const hasGeneratingContent = course ? shouldSubscribe(course) : false;

  // Ref to track unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Use ref for onError to avoid re-subscription loops when callback changes
  const onErrorRef = useRef(onError);
  useIsomorphicLayoutEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // Don't subscribe if disabled, no courseId, or Firebase not authenticated
    if (!enabled || !courseId) {
      return;
    }

    // Check if Firebase is authenticated
    if (!isFirebaseAuthenticated()) {
      // Firebase not authenticated - this is expected if no firebaseToken was provided
      // The app will fall back to polling (handled in useLesson)
      return;
    }

    // Check if we should subscribe based on content status
    if (!hasGeneratingContent) {
      // No content generating, no need to subscribe
      // Clean up any existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setIsSubscribed(false);
      }
      return;
    }

    // Subscribe to the course document
    const unsubscribe = subscribeToCourse(
      courseId,
      (updatedCourse) => {
        // Clear any previous connection error
        setConnectionError(null);

        // Update the course in the store
        updateCourse(courseId, updatedCourse);

        // Check if we should unsubscribe (all content ready)
        if (!shouldSubscribe(updatedCourse)) {
          // All content is ready, unsubscribe
          unsubscribe();
          unsubscribeRef.current = null;
          setIsSubscribed(false);
        }
      },
      (error) => {
        setConnectionError(error.message);
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;
    setIsSubscribed(true);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsSubscribed(false);
    };
    // Note: onError is accessed via ref to avoid re-subscription loops
  }, [courseId, enabled, hasGeneratingContent, updateCourse, shouldSubscribe]);

  return {
    isSubscribed,
    connectionError,
    hasGeneratingContent,
  };
}
