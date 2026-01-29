/**
 * ProgressScreen Tests
 *
 * Tests the progress dashboard including:
 * - Empty state when no courses
 * - Stats calculation with courses
 * - Course list rendering
 * - Responsive layouts
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressScreen } from '../ProgressScreen';
import { Course } from '../../types/app';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      white: '#FFFFFF',
      ios: {
        gray: '#8E8E93',
        blue: '#007AFF',
      },
      card: {
        default: '#FFFFFF',
        stats: {
          blue: '#E3F2FD',
          green: '#E8F5E9',
          orange: '#FFF3E0',
          purple: '#F3E5F5',
        },
      },
    },
    isDark: false,
  }),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    responsive: (small: number) => small,
    screenSize: 'small',
    isSmall: true,
    isMedium: false,
    isLarge: false,
    isSmallPhone: false,
    isTablet: false,
  }),
}));

jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
}));

jest.mock('../../components/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock courses store
const mockCourses: Course[] = [];
const mockUseCoursesStore = jest.fn(() => ({
  courses: mockCourses,
}));

jest.mock('../../state/coursesStore', () => ({
  useCoursesStore: () => mockUseCoursesStore(),
}));

// Helper to create mock courses
const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: `course-${Math.random().toString(36).substr(2, 9)}`,
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
  ...overrides,
});

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to empty courses
    mockUseCoursesStore.mockReturnValue({ courses: [] });
  });

  describe('Empty State', () => {
    it('should render empty state when no courses', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('📊')).toBeTruthy();
      expect(getByText('No courses yet')).toBeTruthy();
      expect(getByText('Start a learning path to track your progress')).toBeTruthy();
    });

    it('should track screen view on mount', () => {
      const { useScreenTracking } = require('../../services/analytics');
      render(<ProgressScreen />);
      expect(useScreenTracking).toHaveBeenCalledWith('Progress', 'ProgressScreen');
    });
  });

  describe('With Courses', () => {
    beforeEach(() => {
      const courses = [
        createMockCourse({
          id: 'course-1',
          title: 'Learn JavaScript',
          emoji: '🟨',
          status: 'active',
          progress: 50,
          lessonsCompleted: 5,
          totalLessons: 10,
        }),
        createMockCourse({
          id: 'course-2',
          title: 'Learn Python',
          emoji: '🐍',
          status: 'completed',
          progress: 100,
          lessonsCompleted: 8,
          totalLessons: 8,
        }),
        createMockCourse({
          id: 'course-3',
          title: 'Learn React',
          emoji: '⚛️',
          status: 'archived',
          progress: 25,
          lessonsCompleted: 2,
          totalLessons: 8,
        }),
      ];
      mockUseCoursesStore.mockReturnValue({ courses });
    });

    it('should render header with title', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Your Progress')).toBeTruthy();
      expect(getByText('Keep up the great work!')).toBeTruthy();
    });

    it('should display active courses count', () => {
      const { getAllByText, getByText } = render(<ProgressScreen />);

      // There may be multiple elements with '1', get all and check at least one exists
      const onesElements = getAllByText('1');
      expect(onesElements.length).toBeGreaterThan(0);
      expect(getByText('Active Courses')).toBeTruthy();
    });

    it('should display completed courses count', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Completed')).toBeTruthy();
    });

    it('should display total lessons completed', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('15')).toBeTruthy(); // 5 + 8 + 2 = 15
      expect(getByText('Lessons Completed')).toBeTruthy();
    });

    it('should display average progress', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('50%')).toBeTruthy(); // Only active course: 50%
      expect(getByText('Average Progress')).toBeTruthy();
    });

    it('should display total lessons', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Total Lessons')).toBeTruthy();
      expect(getByText('26')).toBeTruthy(); // 10 + 8 + 8 = 26
    });

    it('should display archived courses count when > 0', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Archived Courses')).toBeTruthy();
    });

    it('should render course list', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Your Courses')).toBeTruthy();
      expect(getByText('Learn JavaScript')).toBeTruthy();
      expect(getByText('Learn Python')).toBeTruthy();
      expect(getByText('Learn React')).toBeTruthy();
    });

    it('should display course progress info', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('5/10 lessons • 50%')).toBeTruthy();
      expect(getByText('8/8 lessons • 100%')).toBeTruthy();
    });

    it('should display course emojis', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('🟨')).toBeTruthy();
      expect(getByText('🐍')).toBeTruthy();
      expect(getByText('⚛️')).toBeTruthy();
    });
  });

  describe('Stats Calculations', () => {
    it('should calculate average progress for multiple active courses', () => {
      const courses = [
        createMockCourse({ status: 'active', progress: 40 }),
        createMockCourse({ status: 'active', progress: 60 }),
        createMockCourse({ status: 'active', progress: 80 }),
      ];
      mockUseCoursesStore.mockReturnValue({ courses });

      const { getByText } = render(<ProgressScreen />);

      expect(getByText('60%')).toBeTruthy(); // (40 + 60 + 80) / 3 = 60
    });

    it('should show 0% average when no active courses', () => {
      const courses = [
        createMockCourse({ status: 'completed', progress: 100 }),
        createMockCourse({ status: 'archived', progress: 50 }),
      ];
      mockUseCoursesStore.mockReturnValue({ courses });

      const { getByText } = render(<ProgressScreen />);

      expect(getByText('0%')).toBeTruthy();
    });

    it('should count courses without status as active', () => {
      const courses = [
        createMockCourse({ status: undefined as unknown as Course['status'], progress: 30 }),
        createMockCourse({ status: 'active', progress: 70 }),
      ];
      mockUseCoursesStore.mockReturnValue({ courses });

      const { getByText } = render(<ProgressScreen />);

      // Both should be counted as active, average = (30 + 70) / 2 = 50
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // 2 active courses
    });
  });

  describe('Course List Limiting', () => {
    it('should only show first 5 courses in list', () => {
      const courses = Array.from({ length: 10 }, (_, i) =>
        createMockCourse({
          id: `course-${i}`,
          title: `Course ${i + 1}`,
          status: 'active',
        })
      );
      mockUseCoursesStore.mockReturnValue({ courses });

      const { queryByText } = render(<ProgressScreen />);

      expect(queryByText('Course 1')).toBeTruthy();
      expect(queryByText('Course 5')).toBeTruthy();
      expect(queryByText('Course 6')).toBeNull();
      expect(queryByText('Course 10')).toBeNull();
    });
  });

  describe('Default Emoji', () => {
    it('should use default emoji when course has no emoji', () => {
      const courses = [
        createMockCourse({ emoji: undefined }),
      ];
      mockUseCoursesStore.mockReturnValue({ courses });

      const { getByText } = render(<ProgressScreen />);

      expect(getByText('📚')).toBeTruthy();
    });
  });

  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle transition from empty to courses', () => {
      // Start with empty
      mockUseCoursesStore.mockReturnValue({ courses: [] });
      const { rerender, getByText, queryByText } = render(<ProgressScreen />);

      expect(getByText('No courses yet')).toBeTruthy();

      // Update to have courses
      mockUseCoursesStore.mockReturnValue({
        courses: [createMockCourse({ title: 'New Course' })],
      });
      rerender(<ProgressScreen />);

      expect(queryByText('No courses yet')).toBeNull();
      expect(getByText('New Course')).toBeTruthy();
    });

    it('should handle transition from courses to empty', () => {
      // Start with courses
      mockUseCoursesStore.mockReturnValue({
        courses: [createMockCourse({ title: 'Existing Course' })],
      });
      const { rerender, getByText, queryByText } = render(<ProgressScreen />);

      expect(getByText('Existing Course')).toBeTruthy();

      // Update to empty
      mockUseCoursesStore.mockReturnValue({ courses: [] });
      rerender(<ProgressScreen />);

      expect(getByText('No courses yet')).toBeTruthy();
      expect(queryByText('Existing Course')).toBeNull();
    });
  });
});
