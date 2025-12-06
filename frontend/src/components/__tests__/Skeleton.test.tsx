import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton, SkeletonCircle, SkeletonCard } from '../Skeleton';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      gray100: '#F5F5F5',
      gray200: '#E0E0E0',
    },
  }),
}));

jest.mock('../../utils/animations', () => ({
  useShimmer: () => ({
    interpolate: jest.fn(() => 0.5),
  }),
}));

describe('Skeleton', () => {
  it('should render with default props', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with custom width and height', () => {
    const { toJSON } = render(<Skeleton width={200} height={50} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with percentage width', () => {
    const { toJSON } = render(<Skeleton width="50%" height={30} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with numeric border radius', () => {
    const { toJSON } = render(<Skeleton borderRadius={10} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with named border radius', () => {
    const radiusOptions = ['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const;

    radiusOptions.forEach((radius) => {
      const { toJSON } = render(<Skeleton borderRadius={radius} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  it('should render without animation when animated is false', () => {
    const { toJSON } = render(<Skeleton animated={false} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { marginTop: 10 };
    const { toJSON } = render(<Skeleton style={customStyle} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('SkeletonCircle', () => {
  it('should render with default size', () => {
    const { toJSON } = render(<SkeletonCircle />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with custom size', () => {
    const { toJSON } = render(<SkeletonCircle size={64} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render without animation', () => {
    const { toJSON } = render(<SkeletonCircle animated={false} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { marginRight: 10 };
    const { toJSON } = render(<SkeletonCircle style={customStyle} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('SkeletonCard', () => {
  it('should render with default height', () => {
    const { toJSON } = render(<SkeletonCard />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with custom height', () => {
    const { toJSON } = render(<SkeletonCard height={200} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render without animation', () => {
    const { toJSON } = render(<SkeletonCard animated={false} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { marginBottom: 16 };
    const { toJSON } = render(<SkeletonCard style={customStyle} />);
    expect(toJSON()).toBeTruthy();
  });
});
