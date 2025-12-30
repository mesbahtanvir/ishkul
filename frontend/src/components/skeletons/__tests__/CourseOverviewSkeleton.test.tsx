import React from 'react';
import { render } from '@testing-library/react-native';
import { CourseOverviewSkeleton } from '../CourseOverviewSkeleton';

// Mock dependencies
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      gray100: '#F5F5F5',
      gray200: '#E0E0E0',
      surface: '#FFFFFF',
      text: {
        primary: '#1A1A1A',
        secondary: '#6B7280',
      },
      border: '#E5E7EB',
    },
  }),
}));

jest.mock('../../../utils/animations', () => ({
  useShimmer: () => ({
    interpolate: jest.fn(() => 0.5),
  }),
}));

describe('CourseOverviewSkeleton', () => {
  it('should render with default props', () => {
    const { toJSON } = render(<CourseOverviewSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with custom section count', () => {
    const { toJSON } = render(<CourseOverviewSkeleton sectionCount={5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with zero sections', () => {
    const { toJSON } = render(<CourseOverviewSkeleton sectionCount={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with single section', () => {
    const { toJSON } = render(<CourseOverviewSkeleton sectionCount={1} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render header card with skeleton elements', () => {
    const { toJSON } = render(<CourseOverviewSkeleton />);
    const tree = toJSON();

    // Tree should exist and have children (skeleton elements)
    expect(tree).toBeTruthy();
    expect(tree).toHaveProperty('children');
  });

  it('should match snapshot with default props', () => {
    const { toJSON } = render(<CourseOverviewSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match snapshot with custom section count', () => {
    const { toJSON } = render(<CourseOverviewSkeleton sectionCount={2} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
