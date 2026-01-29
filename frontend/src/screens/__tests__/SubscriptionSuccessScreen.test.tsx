/**
 * SubscriptionSuccessScreen Tests
 *
 * Tests the subscription success page including:
 * - Animation rendering
 * - Navigation handling
 * - Checkout verification
 * - Benefits display
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SubscriptionSuccessScreen } from '../SubscriptionSuccessScreen';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      white: '#FFFFFF',
      ios: { green: '#34C759' },
      card: { default: '#FFFFFF' },
    },
    isDark: false,
  }),
}));

jest.mock('../../components/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
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

// Mock subscription store
const mockVerifyCheckout = jest.fn();
const mockFetchStatus = jest.fn();

jest.mock('../../state/subscriptionStore', () => ({
  useSubscriptionStore: Object.assign(
    jest.fn(() => ({
      verifyCheckout: mockVerifyCheckout,
      fetchStatus: mockFetchStatus,
    })),
    {
      setState: jest.fn(),
    }
  ),
}));

// Mock route
const mockUseRoute = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: (cb?: () => void) => cb?.(),
  });
  RN.Animated.sequence = (animations: { start: (cb?: () => void) => void }[]) => ({
    start: (cb?: () => void) => {
      animations.forEach((a) => a.start());
      cb?.();
    },
  });
  RN.Animated.spring = () => ({
    start: (cb?: () => void) => cb?.(),
  });
  return RN;
});

describe('SubscriptionSuccessScreen', () => {
  const mockNavigation = {
    reset: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: {} });
  });

  it('should render without crashing', () => {
    const { toJSON } = render(
      <SubscriptionSuccessScreen navigation={mockNavigation as never} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should display success title and subtitle', () => {
    const { getByText } = render(
      <SubscriptionSuccessScreen navigation={mockNavigation as never} />
    );

    expect(getByText('Welcome to Pro!')).toBeTruthy();
    expect(getByText('Your subscription is now active. Enjoy all the premium features!')).toBeTruthy();
  });

  it('should display all benefit items', () => {
    const { getByText } = render(
      <SubscriptionSuccessScreen navigation={mockNavigation as never} />
    );

    expect(getByText('5 active courses')).toBeTruthy();
    expect(getByText('1,000 steps per day')).toBeTruthy();
    expect(getByText('GPT-5 Pro AI model')).toBeTruthy();
    expect(getByText('Priority generation')).toBeTruthy();
  });

  it('should display Start Learning button', () => {
    const { getByText } = render(
      <SubscriptionSuccessScreen navigation={mockNavigation as never} />
    );

    expect(getByText('Start Learning')).toBeTruthy();
  });

  it('should navigate to Main when Start Learning is pressed', () => {
    const { getByText } = render(
      <SubscriptionSuccessScreen navigation={mockNavigation as never} />
    );

    fireEvent.press(getByText('Start Learning'));

    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  });

  describe('Checkout Verification', () => {
    it('should verify checkout when session_id is provided', () => {
      mockUseRoute.mockReturnValue({ params: { session_id: 'test-session-123' } });

      render(<SubscriptionSuccessScreen navigation={mockNavigation as never} />);

      expect(mockVerifyCheckout).toHaveBeenCalledWith('test-session-123');
    });

    it('should fetch status when no session_id is provided', () => {
      mockUseRoute.mockReturnValue({ params: {} });

      render(<SubscriptionSuccessScreen navigation={mockNavigation as never} />);

      expect(mockFetchStatus).toHaveBeenCalled();
    });

    it('should not verify checkout when session_id is undefined', () => {
      mockUseRoute.mockReturnValue({ params: { session_id: undefined } });

      render(<SubscriptionSuccessScreen navigation={mockNavigation as never} />);

      expect(mockVerifyCheckout).not.toHaveBeenCalled();
      expect(mockFetchStatus).toHaveBeenCalled();
    });
  });

  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle re-render with different session_id', () => {
      mockUseRoute.mockReturnValue({ params: { session_id: 'session-1' } });
      const { rerender } = render(
        <SubscriptionSuccessScreen navigation={mockNavigation as never} />
      );

      expect(mockVerifyCheckout).toHaveBeenCalledWith('session-1');

      // Re-render - component should remain stable
      mockUseRoute.mockReturnValue({ params: { session_id: 'session-2' } });
      rerender(<SubscriptionSuccessScreen navigation={mockNavigation as never} />);

      // Component should still render without errors
      expect(mockVerifyCheckout).toHaveBeenCalled();
    });
  });
});
