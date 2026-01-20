/**
 * Tests for QuizSkeleton component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuizSkeleton } from '../QuizSkeleton';

// Mock dependencies
jest.mock('../../Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../Card', () => ({
  Card: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
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

describe('QuizSkeleton', () => {
  it('should render without crashing', () => {
    const { toJSON } = render(<QuizSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render screen header', () => {
    const { getByTestId } = render(<QuizSkeleton />);
    expect(getByTestId('screen-header')).toBeTruthy();
  });

  it('should render skeleton elements', () => {
    const { getAllByTestId } = render(<QuizSkeleton />);

    // Check for skeleton elements
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(getAllByTestId('skeleton-circle').length).toBeGreaterThan(0);
    expect(getAllByTestId('skeleton-text').length).toBeGreaterThan(0);
    expect(getAllByTestId('skeleton-title').length).toBeGreaterThan(0);
  });

  it('should call onBack when back button is pressed', () => {
    const mockOnBack = jest.fn();
    const { getByTestId } = render(<QuizSkeleton onBack={mockOnBack} />);

    fireEvent.press(getByTestId('back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('should render without back button when onBack is not provided', () => {
    const { queryByTestId } = render(<QuizSkeleton />);
    expect(queryByTestId('back-button')).toBeNull();
  });
});
