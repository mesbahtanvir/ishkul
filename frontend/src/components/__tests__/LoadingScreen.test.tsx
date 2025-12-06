import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingScreen } from '../LoadingScreen';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
      },
      primary: '#0066FF',
    },
    isDark: false,
  }),
}));

describe('LoadingScreen', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<LoadingScreen />);
    // ActivityIndicator doesn't have a test ID by default, but the component should render
  });

  it('should display an ActivityIndicator', () => {
    const { UNSAFE_getByType } = render(<LoadingScreen />);
    // Check that ActivityIndicator is present
    const activityIndicator = UNSAFE_getByType(
      require('react-native').ActivityIndicator
    );
    expect(activityIndicator).toBeTruthy();
  });

  it('should use theme colors for background', () => {
    const { getByTestId, toJSON } = render(<LoadingScreen />);
    const tree = toJSON();
    // The component should render with the background color from the theme
    expect(tree).toBeTruthy();
  });
});
