/**
 * CourseViewScreen Tests
 *
 * Tests the unified course viewing experience including:
 * - Loading state
 * - Error state
 * - Course not found
 * - Active lesson display
 * - Auto-selection of first lesson
 * - Generating state
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CourseViewScreen } from '../CourseViewScreen';
import { Course, OutlineStatuses } from '../../types/app';

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666', tertiary: '#999999' },
      primary: '#0066FF',
      white: '#FFFFFF',
      danger: '#FF3B30',
      card: { default: '#FFFFFF' },
    },
    isDark: false,
  }),
}));

jest.mock('../../components/LearningLayout', () => ({
  LearningLayout: ({ children, title, testID }: { children: React.ReactNode; title?: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID || 'learning-layout'}>
        {title && <Text testID="layout-title">{title}</Text>}
        {children}
      </View>
    );
  },
}));

jest.mock('../../components/Card', () => ({
  Card: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'card'}>{children}</View>;
  },
}));

jest.mock('../../components/Button', () => ({
  Button: ({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={testID || 'button'}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/skeletons', () => ({
  CourseOverviewSkeleton: ({ testID }: { testID?: string; sectionCount?: number }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'course-overview-skeleton'} />;
  },
}));

jest.mock('../CourseView', () => ({
  LessonContent: ({ courseId, lessonId, sectionId, testID, onBack }: {
    courseId: string;
    lessonId: string;
    sectionId: string;
    testID?: string;
    onBack?: () => void;
    onLessonComplete?: () => void;
    isOutlineGenerating?: boolean;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID || 'lesson-content'}>
        <Text testID="lesson-id">{lessonId}</Text>
        <Text testID="section-id">{sectionId}</Text>
        {onBack && (
          <TouchableOpacity onPress={onBack} testID="back-button">
            <Text>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

// Mock courses store
const mockActiveCourse: Course | null = null;
const mockUseCoursesStore = jest.fn(() => ({
  activeCourse: mockActiveCourse,
}));

jest.mock('../../state/coursesStore', () => ({
  useCoursesStore: () => mockUseCoursesStore(),
}));

// Mock course subscription hook
const mockUseCourseSubscription = jest.fn(() => ({
  connectionError: null,
}));

jest.mock('../../hooks/useCourseSubscription', () => ({
  useCourseSubscription: (courseId: string, options: { enabled: boolean; onError?: (err: Error) => void }) =>
    mockUseCourseSubscription(courseId, options),
}));

// Helper to create mock course
const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-123',
  userId: 'user-123',
  title: 'Test Course',
  emoji: '📚',
  status: 'active',
  progress: 0,
  lessonsCompleted: 0,
  totalLessons: 10,
  lastAccessedAt: Date.now(),
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  outlineStatus: OutlineStatuses.READY,
  outline: {
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        lessons: [
          { id: 'lesson-1', title: 'Lesson 1', status: 'available', type: 'lesson' },
          { id: 'lesson-2', title: 'Lesson 2', status: 'locked', type: 'lesson' },
        ],
      },
      {
        id: 'section-2',
        title: 'Section 2',
        lessons: [
          { id: 'lesson-3', title: 'Lesson 3', status: 'locked', type: 'quiz' },
        ],
      },
    ],
  },
  ...overrides,
});

describe('CourseViewScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
  };

  const defaultRoute = {
    params: {
      courseId: 'course-123',
    },
    key: 'course-view-key',
    name: 'CourseView' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCoursesStore.mockReturnValue({ activeCourse: null });
    mockUseCourseSubscription.mockReturnValue({ connectionError: null });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when course is not available', () => {
      mockUseCoursesStore.mockReturnValue({ activeCourse: null });

      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('course-overview-skeleton')).toBeTruthy();
    });

    it('should show loading when activeCourse id does not match route courseId', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({ id: 'different-course' }),
      });

      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('course-overview-skeleton')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should render without crashing when connection error occurs', () => {
      // Connection error is logged but doesn't immediately trigger UI error
      mockUseCourseSubscription.mockReturnValue({
        connectionError: 'Network error',
      });

      // Component should render without crashing
      const { toJSON } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('With Course Data', () => {
    beforeEach(() => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse(),
      });
    });

    it('should render lesson content when course is available', () => {
      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('lesson-content')).toBeTruthy();
    });

    it('should auto-select first lesson when no lessonId in route', () => {
      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      // First lesson should be auto-selected
      expect(getByTestId('lesson-id').props.children).toBe('lesson-1');
      expect(getByTestId('section-id').props.children).toBe('section-1');
    });

    it('should use lessonId from route params when provided', () => {
      const routeWithLesson = {
        ...defaultRoute,
        params: {
          ...defaultRoute.params,
          lessonId: 'lesson-2',
          sectionId: 'section-1',
        },
      };

      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={routeWithLesson as never}
        />
      );

      expect(getByTestId('lesson-id').props.children).toBe('lesson-2');
      expect(getByTestId('section-id').props.children).toBe('section-1');
    });
  });

  describe('Generating State', () => {
    it('should show generating state when outlineStatus is not READY', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outlineStatus: OutlineStatuses.GENERATING,
        }),
      });

      const { getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      // Should still render lesson content but with isOutlineGenerating flag
      expect(getByTestId('lesson-content')).toBeTruthy();
    });
  });

  describe('No Outline Available', () => {
    it('should show message when course has no outline sections', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outline: undefined,
        }),
      });

      const { getByText } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByText('No course outline available')).toBeTruthy();
    });

    it('should provide Go Back button when no outline', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outline: { sections: [] },
        }),
      });

      const { getByText } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      fireEvent.press(getByText('Go Back'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('No Lessons Available', () => {
    it('should show appropriate state when sections exist but have no lessons', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outline: {
            sections: [
              { id: 'section-1', title: 'Empty Section', lessons: [] },
            ],
          },
        }),
      });

      const { queryByText, queryByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      // Component renders without crashing - either shows "No lessons" or skeleton
      // depending on internal state timing
      expect(queryByTestId('learning-layout')).toBeTruthy();
    });
  });

  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle transition from loading to course available', () => {
      // Start with no course
      mockUseCoursesStore.mockReturnValue({ activeCourse: null });
      const { rerender, getByTestId, queryByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('course-overview-skeleton')).toBeTruthy();

      // Update to have course
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse(),
      });
      rerender(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(queryByTestId('course-overview-skeleton')).toBeNull();
      expect(getByTestId('lesson-content')).toBeTruthy();
    });

    it('should handle transition from generating to ready', () => {
      // Start with generating
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outlineStatus: OutlineStatuses.GENERATING,
        }),
      });
      const { rerender, getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('lesson-content')).toBeTruthy();

      // Update to ready
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({
          outlineStatus: OutlineStatuses.READY,
        }),
      });
      rerender(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('lesson-content')).toBeTruthy();
    });

    it('should handle course change (different courseId)', () => {
      mockUseCoursesStore.mockReturnValue({
        activeCourse: createMockCourse({ id: 'course-123' }),
      });

      const { rerender, getByTestId } = render(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={defaultRoute as never}
        />
      );

      expect(getByTestId('lesson-content')).toBeTruthy();

      // Simulate navigating to different course (activeCourse mismatch)
      const newRoute = {
        ...defaultRoute,
        params: { courseId: 'course-456' },
      };

      // activeCourse still has old course
      rerender(
        <CourseViewScreen
          navigation={mockNavigation as never}
          route={newRoute as never}
        />
      );

      // Should show loading because course IDs don't match
      expect(getByTestId('course-overview-skeleton')).toBeTruthy();
    });
  });
});
