import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ErrorBanner } from '../ErrorBanner';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      danger: '#DC3545',
      warning: '#FFC107',
      info: '#17A2B8',
    },
  }),
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = jest.fn(() => ({
    start: (callback?: () => void) => callback && callback(),
  }));
  RN.Animated.parallel = jest.fn((animations) => ({
    start: (callback?: () => void) => {
      animations.forEach((anim: { start: () => void }) => anim.start());
      if (callback) callback();
    },
  }));
  return RN;
});

describe('ErrorBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with message', () => {
      const { getByText } = render(<ErrorBanner message="Error occurred" />);
      expect(getByText('Error occurred')).toBeTruthy();
    });

    it('should not render when message is null', () => {
      const { queryByText } = render(<ErrorBanner message={null} />);
      expect(queryByText('Error occurred')).toBeNull();
    });

    it('should not render when message is empty string', () => {
      const { toJSON } = render(<ErrorBanner message="" />);
      // Component should return null for empty message
      expect(toJSON()).toBeNull();
    });
  });

  describe('type variants', () => {
    it('should render error type by default', () => {
      const { getByText } = render(<ErrorBanner message="Error message" />);
      expect(getByText('Error message')).toBeTruthy();
    });

    it('should render error type explicitly', () => {
      const { getByText } = render(
        <ErrorBanner message="Error message" type="error" />
      );
      expect(getByText('Error message')).toBeTruthy();
    });

    it('should render warning type', () => {
      const { getByText } = render(
        <ErrorBanner message="Warning message" type="warning" />
      );
      expect(getByText('Warning message')).toBeTruthy();
    });

    it('should render info type', () => {
      const { getByText } = render(
        <ErrorBanner message="Info message" type="info" />
      );
      expect(getByText('Info message')).toBeTruthy();
    });
  });

  describe('dismiss functionality', () => {
    it('should show dismiss button by default', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <ErrorBanner message="Error" onDismiss={onDismiss} />
      );
      expect(getByText('✕')).toBeTruthy();
    });

    it('should hide dismiss button when showDismiss is false', () => {
      const onDismiss = jest.fn();
      const { queryByText } = render(
        <ErrorBanner message="Error" onDismiss={onDismiss} showDismiss={false} />
      );
      expect(queryByText('✕')).toBeNull();
    });

    it('should not show dismiss button when no onDismiss provided', () => {
      const { queryByText } = render(<ErrorBanner message="Error" />);
      expect(queryByText('✕')).toBeNull();
    });

    it('should call onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <ErrorBanner message="Error" onDismiss={onDismiss} />
      );

      fireEvent.press(getByText('✕'));

      // Animation completes then callback is called
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto dismiss', () => {
    it('should auto-dismiss after specified time', () => {
      const onDismiss = jest.fn();
      render(
        <ErrorBanner
          message="Auto dismiss"
          onDismiss={onDismiss}
          autoDismissMs={3000}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // onDismiss should be called after timeout
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should not auto-dismiss when autoDismissMs is 0', () => {
      const onDismiss = jest.fn();
      render(
        <ErrorBanner
          message="No auto dismiss"
          onDismiss={onDismiss}
          autoDismissMs={0}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss when no onDismiss provided', () => {
      const { getByText } = render(
        <ErrorBanner message="No dismiss handler" autoDismissMs={1000} />
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Banner should still be visible
      expect(getByText('No dismiss handler')).toBeTruthy();
    });
  });

  describe('message updates', () => {
    it('should update when message changes', () => {
      const { rerender, getByText } = render(
        <ErrorBanner message="First message" />
      );
      expect(getByText('First message')).toBeTruthy();

      rerender(<ErrorBanner message="Second message" />);
      expect(getByText('Second message')).toBeTruthy();
    });

    it('should hide when message becomes null', () => {
      const { rerender, queryByText } = render(
        <ErrorBanner message="Visible" />
      );
      expect(queryByText('Visible')).toBeTruthy();

      rerender(<ErrorBanner message={null} />);
      expect(queryByText('Visible')).toBeNull();
    });
  });

  describe('icon display', () => {
    it('should show exclamation mark for error type', () => {
      const { getByText } = render(
        <ErrorBanner message="Error" type="error" />
      );
      expect(getByText('!')).toBeTruthy();
    });

    it('should show exclamation mark for warning type', () => {
      const { getByText } = render(
        <ErrorBanner message="Warning" type="warning" />
      );
      expect(getByText('!')).toBeTruthy();
    });

    it('should show info icon for info type', () => {
      const { getByText } = render(
        <ErrorBanner message="Info" type="info" />
      );
      expect(getByText('i')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle long messages', () => {
      const longMessage = 'This is a very long error message that might overflow or wrap to multiple lines in the banner component';
      const { getByText } = render(<ErrorBanner message={longMessage} />);
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>';
      const { getByText } = render(<ErrorBanner message={specialMessage} />);
      expect(getByText(specialMessage)).toBeTruthy();
    });

    it('should handle unicode in message', () => {
      const unicodeMessage = 'エラーが発生しました 🚨';
      const { getByText } = render(<ErrorBanner message={unicodeMessage} />);
      expect(getByText(unicodeMessage)).toBeTruthy();
    });
  });

  describe('combined props', () => {
    it('should handle all props together', () => {
      const onDismiss = jest.fn();
      const { getByText } = render(
        <ErrorBanner
          message="Full feature banner"
          type="warning"
          onDismiss={onDismiss}
          autoDismissMs={5000}
          showDismiss={true}
        />
      );

      expect(getByText('Full feature banner')).toBeTruthy();
      expect(getByText('!')).toBeTruthy();
      expect(getByText('✕')).toBeTruthy();
    });
  });
});
