/**
 * Tests for PracticeSkeleton component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PracticeSkeleton } from '../PracticeSkeleton';

// Mock theme
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      card: { default: '#FFFFFF' },
    },
    isDark: false,
  }),
}));

// Mock dependencies
jest.mock('../../Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../ScreenHeader', () => ({
  ScreenHeader: ({ onBack, testID }: { title: string; onBack?: () => void; testID?: string }) => {
    const { TouchableOpacity, View, Text } = require('react-native');
    return (
      <View testID={testID || 'screen-header'}>
        {onBack && (
          <TouchableOpacity onPress={onBack} testID="back-button">
            <Text>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

jest.mock('../../Skeleton', () => ({
  Skeleton: ({ testID }: { testID?: string; width?: number | string; height?: number }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'skeleton'} />;
  },
  SkeletonCircle: ({ testID }: { testID?: string; size?: number }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'skeleton-circle'} />;
  },
}));

jest.mock('../../SkeletonText', () => ({
  SkeletonText: ({ testID }: { testID?: string; lines?: number }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'skeleton-text'} />;
  },
  SkeletonTitle: ({ testID }: { testID?: string; size?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID || 'skeleton-title'} />;
  },
}));

describe('PracticeSkeleton', () => {
  it('should render without crashing', () => {
    const { toJSON } = render(<PracticeSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render screen header', () => {
    const { getByTestId } = render(<PracticeSkeleton />);
    expect(getByTestId('screen-header')).toBeTruthy();
  });

  it('should render skeleton elements', () => {
    const { getAllByTestId } = render(<PracticeSkeleton />);

    // Check for skeleton elements - PracticeSkeleton has many
    const skeletons = getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(5); // Has bullet points, labels, etc.

    expect(getAllByTestId('skeleton-circle').length).toBeGreaterThan(0);
    expect(getAllByTestId('skeleton-text').length).toBeGreaterThan(0);
    expect(getAllByTestId('skeleton-title').length).toBeGreaterThan(0);
  });

  it('should call onBack when back button is pressed', () => {
    const mockOnBack = jest.fn();
    const { getByTestId } = render(<PracticeSkeleton onBack={mockOnBack} />);

    fireEvent.press(getByTestId('back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('should render without back button when onBack is not provided', () => {
    const { queryByTestId } = render(<PracticeSkeleton />);
    expect(queryByTestId('back-button')).toBeNull();
  });

  it('should render hints container with bullets', () => {
    const { getAllByTestId } = render(<PracticeSkeleton />);

    // Has bullet skeletons (circles) in hint items
    const skeletons = getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(8); // 3 bullets + other elements
  });
});
