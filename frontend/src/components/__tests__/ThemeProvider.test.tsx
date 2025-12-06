import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../ThemeProvider';

// Mock dependencies
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('../../state/themeStore', () => ({
  initializeThemeListener: jest.fn(() => jest.fn()),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
      },
      primary: '#0066FF',
    },
    isDark: false,
    isHydrated: true,
  }),
}));

describe('ThemeProvider', () => {
  it('should render children when hydrated', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Text>Test Child</Text>
      </ThemeProvider>
    );

    expect(getByText('Test Child')).toBeTruthy();
  });

  it('should initialize theme listener on mount', () => {
    const { initializeThemeListener } = require('../../state/themeStore');

    render(
      <ThemeProvider>
        <Text>Test</Text>
      </ThemeProvider>
    );

    expect(initializeThemeListener).toHaveBeenCalled();
  });

  it('should cleanup theme listener on unmount', () => {
    const cleanup = jest.fn();
    const { initializeThemeListener } = require('../../state/themeStore');
    initializeThemeListener.mockReturnValue(cleanup);

    const { unmount } = render(
      <ThemeProvider>
        <Text>Test</Text>
      </ThemeProvider>
    );

    unmount();

    expect(cleanup).toHaveBeenCalled();
  });
});

// Note: Testing loading state with isHydrated=false requires module isolation
// which conflicts with how @testing-library/react-native registers cleanup hooks.
// The loading state behavior is covered by the ThemeProvider implementation.
