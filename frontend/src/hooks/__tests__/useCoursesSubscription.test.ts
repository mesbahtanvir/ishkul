/**
 * useCoursesSubscription Hook Tests
 *
 * Tests the real-time courses subscription hook including:
 * - Subscription lifecycle
 * - Authentication checks
 * - Error handling
 * - Status filtering
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCoursesSubscription } from '../useCoursesSubscription';

// Mock Firebase services
const mockSubscribeToUserCourses = jest.fn();
const mockIsFirebaseAuthenticated = jest.fn();

jest.mock('../../services/firebase', () => ({
  subscribeToUserCourses: (onData: (courses: unknown[]) => void, onError: (error: Error) => void, statusFilter?: string) =>
    mockSubscribeToUserCourses(onData, onError, statusFilter),
  isFirebaseAuthenticated: () => mockIsFirebaseAuthenticated(),
  SubscriptionError: class SubscriptionError extends Error {},
}));

// Mock courses store
const mockSetCourses = jest.fn();
jest.mock('../../state/coursesStore', () => ({
  useCoursesStore: (selector: (state: { setCourses: jest.Mock }) => unknown) => {
    const state = { setCourses: mockSetCourses };
    return selector(state);
  },
}));

describe('useCoursesSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFirebaseAuthenticated.mockReturnValue(true);
    mockSubscribeToUserCourses.mockImplementation(() => jest.fn());
  });

  describe('Initial State', () => {
    it('should start with isLoading true', () => {
      mockSubscribeToUserCourses.mockImplementation(() => jest.fn());

      const { result } = renderHook(() => useCoursesSubscription());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.connectionError).toBe(null);
    });

    it('should not subscribe when enabled is false', () => {
      const { result } = renderHook(() =>
        useCoursesSubscription({ enabled: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockSubscribeToUserCourses).not.toHaveBeenCalled();
    });

    it('should not subscribe when Firebase is not authenticated', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useCoursesSubscription());

      expect(result.current.isLoading).toBe(false);
      expect(mockSubscribeToUserCourses).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should subscribe when Firebase is authenticated', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(true);

      renderHook(() => useCoursesSubscription());

      expect(mockSubscribeToUserCourses).toHaveBeenCalled();
    });

    it('should call setCourses when data is received', async () => {
      const mockCourses = [{ id: 'course-1', title: 'Test Course' }];

      mockSubscribeToUserCourses.mockImplementation((onData) => {
        // Simulate data callback
        setTimeout(() => onData(mockCourses), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useCoursesSubscription());

      await waitFor(() => {
        expect(mockSetCourses).toHaveBeenCalledWith(mockCourses);
      });

      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToUserCourses.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useCoursesSubscription());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear connection error when data is received', async () => {
      let onDataCallback: (courses: unknown[]) => void = () => {};

      mockSubscribeToUserCourses.mockImplementation((onData) => {
        onDataCallback = onData;
        return jest.fn();
      });

      const { result } = renderHook(() => useCoursesSubscription());

      // Simulate data received
      act(() => {
        onDataCallback([{ id: 'course-1' }]);
      });

      expect(result.current.connectionError).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should set connection error when subscription fails', async () => {
      mockSubscribeToUserCourses.mockImplementation((onData, onError) => {
        setTimeout(() => onError({ message: 'Network error' }), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useCoursesSubscription());

      await waitFor(() => {
        expect(result.current.connectionError).toBe('Network error');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should call onError callback when error occurs', async () => {
      const mockOnError = jest.fn();
      const error = { message: 'Subscription failed' };

      mockSubscribeToUserCourses.mockImplementation((onData, onError) => {
        setTimeout(() => onError(error), 0);
        return jest.fn();
      });

      renderHook(() =>
        useCoursesSubscription({ onError: mockOnError })
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Status Filter', () => {
    it('should pass status filter to subscription', () => {
      mockSubscribeToUserCourses.mockImplementation(() => jest.fn());

      renderHook(() =>
        useCoursesSubscription({ statusFilter: 'active' })
      );

      expect(mockSubscribeToUserCourses).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'active'
      );
    });

    it('should resubscribe when status filter changes', () => {
      mockSubscribeToUserCourses.mockImplementation(() => jest.fn());

      const { rerender } = renderHook(
        ({ statusFilter }) => useCoursesSubscription({ statusFilter }),
        { initialProps: { statusFilter: 'active' as const } }
      );

      expect(mockSubscribeToUserCourses).toHaveBeenCalledTimes(1);

      rerender({ statusFilter: 'completed' as const });

      expect(mockSubscribeToUserCourses).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Transitions', () => {
    it('should handle enabled toggle', async () => {
      mockSubscribeToUserCourses.mockImplementation(() => jest.fn());

      const { rerender, result } = renderHook(
        ({ enabled }) => useCoursesSubscription({ enabled }),
        { initialProps: { enabled: true } }
      );

      expect(mockSubscribeToUserCourses).toHaveBeenCalledTimes(1);

      // Disable
      rerender({ enabled: false });

      expect(result.current.isLoading).toBe(false);
    });

    it('should not subscribe when Firebase is not authenticated initially', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useCoursesSubscription());

      expect(mockSubscribeToUserCourses).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);

      // Note: The hook doesn't automatically re-subscribe when auth state changes
      // because isFirebaseAuthenticated() is called once on mount.
      // A new component mount or enabled toggle would be needed to re-check.
    });
  });

  describe('Multiple Data Updates', () => {
    it('should handle multiple data updates', async () => {
      let onDataCallback: (courses: unknown[]) => void = () => {};

      mockSubscribeToUserCourses.mockImplementation((onData) => {
        onDataCallback = onData;
        return jest.fn();
      });

      const { result } = renderHook(() => useCoursesSubscription());

      // First update
      act(() => {
        onDataCallback([{ id: 'course-1' }]);
      });

      expect(mockSetCourses).toHaveBeenCalledWith([{ id: 'course-1' }]);
      expect(result.current.isSubscribed).toBe(true);

      // Second update
      act(() => {
        onDataCallback([{ id: 'course-1' }, { id: 'course-2' }]);
      });

      expect(mockSetCourses).toHaveBeenCalledWith([
        { id: 'course-1' },
        { id: 'course-2' },
      ]);
    });
  });
});
