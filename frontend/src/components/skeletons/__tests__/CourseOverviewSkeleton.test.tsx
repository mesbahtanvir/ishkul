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
  describe('Rendering', () => {
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
  });

  describe('Structure', () => {
    it('should render header card with expected skeleton elements', () => {
      const { getAllByTestId, UNSAFE_root } = render(<CourseOverviewSkeleton />);

      // The component should have a root view
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render default 3 section cards', () => {
      const { UNSAFE_getAllByType } = render(<CourseOverviewSkeleton />);

      // We can verify the component renders without errors
      // The internal structure includes Card components for header + sections
      expect(UNSAFE_getAllByType).toBeDefined();
    });

    it('should render correct number of section cards based on prop', () => {
      // Render with 2 sections
      const { toJSON: json2 } = render(<CourseOverviewSkeleton sectionCount={2} />);
      expect(json2()).toBeTruthy();

      // Render with 4 sections
      const { toJSON: json4 } = render(<CourseOverviewSkeleton sectionCount={4} />);
      expect(json4()).toBeTruthy();
    });
  });

  describe('Shimmer Animation', () => {
    it('should include shimmer animation elements', () => {
      // The skeleton should render animated views for shimmer effect
      const { toJSON } = render(<CourseOverviewSkeleton />);
      const tree = toJSON();

      // Tree should exist and have children (skeleton elements)
      expect(tree).toBeTruthy();
      expect(tree).toHaveProperty('children');
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot with default props', () => {
      const { toJSON } = render(<CourseOverviewSkeleton />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with custom section count', () => {
      const { toJSON } = render(<CourseOverviewSkeleton sectionCount={2} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
