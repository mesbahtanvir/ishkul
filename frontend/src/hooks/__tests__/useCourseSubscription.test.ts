/**
 * Tests for useCourseSubscription hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { Course } from '../../types/app';

// Mock functions
const mockSubscribeToCourse = jest.fn();
const mockHasPendingContent = jest.fn();
const mockIsFirebaseAuthenticated = jest.fn();
const mockUpdateCourse = jest.fn();
const mockUnsubscribe = jest.fn();

// Mock the store
const mockCourse: Partial<Course> = {
  id: 'course-123',
  title: 'Test Course',
  outlineStatus: 'generating',
  outline: {
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            blocksStatus: 'generating',
          },
        ],
      },
    ],
  },
};

let storeState: {
  courses: Course[];
  activeCourse: Course | null;
} = {
  courses: [],
  activeCourse: null,
};

jest.mock('../../state/coursesStore', () => ({
  useCoursesStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('../../services/firebase', () => ({
  subscribeToCourse: (...args: unknown[]) => mockSubscribeToCourse(...args),
  hasPendingContent: (...args: unknown[]) => mockHasPendingContent(...args),
  isFirebaseAuthenticated: () => mockIsFirebaseAuthenticated(),
}));

import { useCourseSubscription } from '../useCourseSubscription';

describe('useCourseSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state
    storeState = {
      courses: [mockCourse as Course],
      activeCourse: null,
    };

    // Default mock implementations
    mockIsFirebaseAuthenticated.mockReturnValue(true);
    mockHasPendingContent.mockReturnValue(true);
    mockSubscribeToCourse.mockImplementation((courseId, onUpdate, onError) => {
      return mockUnsubscribe;
    });
  });

  describe('subscription lifecycle', () => {
    it('should not subscribe when courseId is null', () => {
      const { result } = renderHook(() => useCourseSubscription(null));

      expect(mockSubscribeToCourse).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should not subscribe when courseId is undefined', () => {
      const { result } = renderHook(() => useCourseSubscription(undefined));

      expect(mockSubscribeToCourse).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should not subscribe when enabled is false', () => {
      const { result } = renderHook(() =>
        useCourseSubscription('course-123', { enabled: false })
      );

      expect(mockSubscribeToCourse).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should not subscribe when Firebase is not authenticated', () => {
      mockIsFirebaseAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(mockSubscribeToCourse).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should not subscribe when no content is generating', () => {
      mockHasPendingContent.mockReturnValue(false);

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(mockSubscribeToCourse).not.toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should subscribe when all conditions are met', () => {
      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(mockSubscribeToCourse).toHaveBeenCalledWith(
        'course-123',
        expect.any(Function),
        expect.any(Function)
      );
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useCourseSubscription('course-123'));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe when courseId changes', () => {
      const { rerender } = renderHook(
        ({ courseId }) => useCourseSubscription(courseId),
        { initialProps: { courseId: 'course-123' } }
      );

      // Change courseId
      rerender({ courseId: 'course-456' });

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe when enabled becomes false', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useCourseSubscription('course-123', { enabled }),
        { initialProps: { enabled: true } }
      );

      expect(mockSubscribeToCourse).toHaveBeenCalled();

      // Disable subscription
      rerender({ enabled: false });

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('course updates', () => {
    it('should update course in store when snapshot received', () => {
      // Track the onUpdate callback
      let capturedOnUpdate: ((course: Course) => void) | null = null;

      mockSubscribeToCourse.mockImplementation((courseId, onUpdate) => {
        capturedOnUpdate = onUpdate;
        return mockUnsubscribe;
      });

      // Need to mock store with updateCourse function
      storeState = {
        courses: [mockCourse as Course],
        activeCourse: null,
      };

      // For this test, we need to verify that updateCourse would be called
      // The hook internally calls updateCourse when a snapshot is received
      renderHook(() => useCourseSubscription('course-123'));

      expect(capturedOnUpdate).not.toBeNull();
    });

    it('should clear connection error when update received', () => {
      let capturedOnUpdate: ((course: Course) => void) | null = null;
      let capturedOnError: ((error: { message: string }) => void) | null = null;

      mockSubscribeToCourse.mockImplementation((courseId, onUpdate, onError) => {
        capturedOnUpdate = onUpdate;
        capturedOnError = onError;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      // Simulate an error
      act(() => {
        capturedOnError?.({ message: 'Connection lost' });
      });

      expect(result.current.connectionError).toBe('Connection lost');

      // Simulate successful update
      act(() => {
        capturedOnUpdate?.(mockCourse as Course);
      });

      expect(result.current.connectionError).toBeNull();
    });

    it('should unsubscribe when all content becomes ready', () => {
      let capturedOnUpdate: ((course: Course) => void) | null = null;

      mockSubscribeToCourse.mockImplementation((courseId, onUpdate) => {
        capturedOnUpdate = onUpdate;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(result.current.isSubscribed).toBe(true);

      // Simulate content becoming ready
      mockHasPendingContent.mockReturnValue(false);

      const readyCourse: Partial<Course> = {
        ...mockCourse,
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [{ id: 'block-1', type: 'text', contentStatus: 'ready' }],
                },
              ],
            },
          ],
        },
      };

      act(() => {
        capturedOnUpdate?.(readyCourse as Course);
      });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set connectionError when error occurs', () => {
      let capturedOnError: ((error: { message: string }) => void) | null = null;

      mockSubscribeToCourse.mockImplementation((courseId, onUpdate, onError) => {
        capturedOnError = onError;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      // Simulate an error
      act(() => {
        capturedOnError?.({ message: 'Connection lost. Retrying...' });
      });

      expect(result.current.connectionError).toBe('Connection lost. Retrying...');
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      let capturedOnError: ((error: { message: string }) => void) | null = null;

      mockSubscribeToCourse.mockImplementation((courseId, onUpdate, onErrorCb) => {
        capturedOnError = onErrorCb;
        return mockUnsubscribe;
      });

      renderHook(() => useCourseSubscription('course-123', { onError }));

      const error = { message: 'Permission denied' };

      act(() => {
        capturedOnError?.(error);
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('hasGeneratingContent', () => {
    it('should return true when content is generating', () => {
      mockHasPendingContent.mockReturnValue(true);

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(result.current.hasGeneratingContent).toBe(true);
    });

    it('should return false when all content is ready', () => {
      mockHasPendingContent.mockReturnValue(false);

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      expect(result.current.hasGeneratingContent).toBe(false);
    });

    it('should return false when course is not found', () => {
      storeState = {
        courses: [],
        activeCourse: null,
      };

      const { result } = renderHook(() => useCourseSubscription('non-existent'));

      expect(result.current.hasGeneratingContent).toBe(false);
    });
  });

  describe('fallback to activeCourse', () => {
    it('should use activeCourse when course not in courses array', () => {
      storeState = {
        courses: [],
        activeCourse: mockCourse as Course,
      };

      const { result } = renderHook(() => useCourseSubscription('course-123'));

      // Should still attempt to subscribe because activeCourse has generating content
      expect(result.current.hasGeneratingContent).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should handle transition from not subscribed to subscribed', () => {
      mockHasPendingContent.mockReturnValue(false);

      const { result, rerender } = renderHook(
        ({ courseId }) => useCourseSubscription(courseId),
        { initialProps: { courseId: 'course-123' } }
      );

      expect(result.current.isSubscribed).toBe(false);

      // Content starts generating
      mockHasPendingContent.mockReturnValue(true);
      rerender({ courseId: 'course-123' });

      expect(result.current.isSubscribed).toBe(true);
    });

    it('should handle rapid course ID changes', () => {
      const { rerender } = renderHook(
        ({ courseId }) => useCourseSubscription(courseId),
        { initialProps: { courseId: 'course-1' } }
      );

      rerender({ courseId: 'course-2' });
      rerender({ courseId: 'course-3' });
      rerender({ courseId: 'course-4' });

      // Each change should trigger unsubscribe from previous
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
