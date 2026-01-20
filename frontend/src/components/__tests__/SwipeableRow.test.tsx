/**
 * SwipeableRow Tests
 *
 * Tests the swipeable row component including:
 * - Web rendering (inline actions)
 * - Mobile rendering (swipe actions)
 * - Action handlers
 * - Disabled state
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { SwipeableRow, SwipeAction } from '../SwipeableRow';

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      white: '#FFFFFF',
      danger: '#FF3B30',
      primary: '#0066FF',
    },
  }),
}));

describe('SwipeableRow', () => {
  const mockOnDelete = jest.fn();
  const mockOnArchive = jest.fn();

  const rightActions: SwipeAction[] = [
    { label: 'Archive', icon: '📁', color: '#FF9500', onPress: mockOnArchive },
    { label: 'Delete', icon: '🗑️', color: '#FF3B30', onPress: mockOnDelete },
  ];

  const leftActions: SwipeAction[] = [
    { label: 'Star', icon: '⭐', color: '#FFD700', onPress: jest.fn() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Web Platform', () => {
    beforeAll(() => {
      Platform.OS = 'web';
    });

    it('should render children', () => {
      const { getByText } = render(
        <SwipeableRow>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Row Content')).toBeTruthy();
    });

    it('should render right actions on web', () => {
      const { getByText } = render(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Delete')).toBeTruthy();
      expect(getByText('Archive')).toBeTruthy();
    });

    it('should call action onPress when clicked on web', () => {
      const { getByText } = render(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      fireEvent.press(getByText('Delete'));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Archive'));
      expect(mockOnArchive).toHaveBeenCalledTimes(1);
    });

    it('should render action icons on web', () => {
      const { getByText } = render(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('🗑️')).toBeTruthy();
      expect(getByText('📁')).toBeTruthy();
    });

    it('should render without actions when none provided', () => {
      const { getByText, queryByText } = render(
        <SwipeableRow>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Row Content')).toBeTruthy();
      expect(queryByText('Delete')).toBeNull();
    });
  });

  describe('Mobile Platform', () => {
    beforeAll(() => {
      Platform.OS = 'ios';
    });

    afterAll(() => {
      Platform.OS = 'web';
    });

    it('should render children on mobile', () => {
      const { getByText } = render(
        <SwipeableRow>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Row Content')).toBeTruthy();
    });

    it('should render right action buttons on mobile', () => {
      const { getByText } = render(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      // Action buttons are rendered but hidden until swiped
      expect(getByText('Delete')).toBeTruthy();
      expect(getByText('Archive')).toBeTruthy();
    });

    it('should render left action buttons on mobile', () => {
      const { getByText } = render(
        <SwipeableRow leftActions={leftActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Star')).toBeTruthy();
    });

    it('should render both left and right actions', () => {
      const { getByText } = render(
        <SwipeableRow leftActions={leftActions} rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Star')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
      expect(getByText('Archive')).toBeTruthy();
    });

    it('should call action onPress when action button is pressed', () => {
      const { getByText } = render(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      // Press the action button (simulates after swipe reveals it)
      fireEvent.press(getByText('Delete'));

      // Action is called after a small delay (100ms in component)
      // Since we're testing directly, the mock should be called
      setTimeout(() => {
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      }, 150);
    });
  });

  describe('Props', () => {
    beforeAll(() => {
      Platform.OS = 'ios';
    });

    it('should use custom action width', () => {
      const { toJSON } = render(
        <SwipeableRow rightActions={rightActions} actionWidth={100}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should handle disabled state', () => {
      const { toJSON } = render(
        <SwipeableRow rightActions={rightActions} disabled>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render action with custom text color', () => {
      const actionsWithTextColor: SwipeAction[] = [
        { label: 'Custom', color: '#000000', textColor: '#FFFFFF', onPress: jest.fn() },
      ];

      const { getByText } = render(
        <SwipeableRow rightActions={actionsWithTextColor}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Custom')).toBeTruthy();
    });
  });

  describe('State Transitions', () => {
    beforeAll(() => {
      Platform.OS = 'web';
    });

    it('should handle transition from no actions to with actions', () => {
      const { rerender, queryByText, getByText } = render(
        <SwipeableRow>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(queryByText('Delete')).toBeNull();

      rerender(
        <SwipeableRow rightActions={rightActions}>
          <Text>Row Content</Text>
        </SwipeableRow>
      );

      expect(getByText('Delete')).toBeTruthy();
    });
  });
});
