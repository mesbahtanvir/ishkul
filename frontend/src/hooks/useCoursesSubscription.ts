/**
 * useCoursesSubscription Hook
 *
 * Subscribes to the user's courses collection in Firestore for real-time updates.
 * This replaces polling/fetching courses from the backend API.
 *
 * The subscription is automatically managed:
 * - Activates when Firebase is authenticated
 * - Updates the courses store with real-time changes
 * - Handles errors gracefully
 */

import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useCoursesStore } from '../state/coursesStore';
import {
  subscribeToUserCourses,
  isFirebaseAuthenticated,
  SubscriptionError,
} from '../services/firebase';

// Use useLayoutEffect on client, useEffect on server (SSR-safe)
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface UseCoursesSubscriptionOptions {
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Optional status filter ('active', 'completed', 'archived') */
  statusFilter?: 'active' | 'completed' | 'archived';
  /** Callback when connection error occurs */
  onError?: (error: SubscriptionError) => void;
}

interface UseCoursesSubscriptionReturn {
  /** Whether the subscription is currently active */
  isSubscribed: boolean;
  /** Connection error message, if any */
  connectionError: string | null;
  /** Whether we're waiting for initial data */
  isLoading: boolean;
}

/**
 * Hook to subscribe to user's courses collection for real-time updates
 *
 * @param options - Configuration options
 *
 * @example
 * // In HomeScreen
 * const { isSubscribed, isLoading, connectionError } = useCoursesSubscription();
 * const courses = useCoursesStore((state) => state.courses);
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (connectionError) return <ErrorMessage error={connectionError} />;
 */
export function useCoursesSubscription(
  options: UseCoursesSubscriptionOptions = {}
): UseCoursesSubscriptionReturn {
  const { enabled = true, statusFilter, onError } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReceivedData, setHasReceivedData] = useState(false);

  const setCourses = useCoursesStore((state) => state.setCourses);

  // Ref to track unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Use ref for onError to avoid re-subscription loops when callback changes
  const onErrorRef = useRef(onError);
  useIsomorphicLayoutEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // Don't subscribe if disabled
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Check if Firebase is authenticated
    if (!isFirebaseAuthenticated()) {
      // Firebase not authenticated - can't subscribe
      setIsLoading(false);
      return;
    }

    // Subscribe to user's courses
    const unsubscribe = subscribeToUserCourses(
      (courses) => {
        // Clear any previous connection error
        setConnectionError(null);

        // Update the courses in the store
        setCourses(courses);

        // Mark as subscribed and no longer loading
        setIsSubscribed(true);
        setIsLoading(false);
        setHasReceivedData(true);
      },
      (error) => {
        setConnectionError(error.message);
        setIsLoading(false);
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      },
      statusFilter
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsSubscribed(false);
    };
    // Note: onError is accessed via ref to avoid re-subscription loops
  }, [enabled, statusFilter, setCourses]);

  return {
    isSubscribed,
    connectionError,
    isLoading: isLoading && !hasReceivedData,
  };
}
