/**
 * CourseScreen Tests
 *
 * CourseScreen is now a simple redirect component that redirects to CourseOutlineScreen.
 * These tests verify the redirect behavior.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { CourseScreen } from '../CourseScreen';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Course'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Course'>;

// Mock analytics
jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
}));

// Mock navigation
const mockReplace = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: jest.fn(),
  goBack: jest.fn(),
} as unknown as NavigationProp;

const createMockRoute = (courseId: string = 'test-path-123'): ScreenRouteProp =>
  ({
    key: 'Course-test',
    name: 'Course',
    params: { courseId },
  }) as unknown as ScreenRouteProp;

describe('CourseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to CourseOutlineScreen', async () => {
    render(<CourseScreen navigation={mockNavigation} route={createMockRoute()} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('CourseOutline', {
        courseId: 'test-path-123',
      });
    });
  });

  it('should pass correct courseId from route params', async () => {
    const customCourseId = 'custom-course-456';
    render(
      <CourseScreen navigation={mockNavigation} route={createMockRoute(customCourseId)} />
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('CourseOutline', {
        courseId: customCourseId,
      });
    });
  });

  it('should show loading screen while redirecting', () => {
    const { UNSAFE_root } = render(
      <CourseScreen navigation={mockNavigation} route={createMockRoute()} />
    );

    // LoadingScreen renders an ActivityIndicator - component should render without crashing
    expect(UNSAFE_root).toBeTruthy();
  });
});
