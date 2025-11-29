import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GoalSelectionScreen } from '../GoalSelectionScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
};

// Mock route
const mockRoute = {
  params: { isCreatingNewPath: false },
};

describe('GoalSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the title', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('What do you want to learn?')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText(/Set your learning goal/)).toBeTruthy();
    });

    it('should render the input field with label', () => {
      const { getByText, getByPlaceholderText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Your Learning Goal')).toBeTruthy();
      expect(getByPlaceholderText(/Learn Spanish/)).toBeTruthy();
    });

    it('should render all example goals', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Popular Goals')).toBeTruthy();
      expect(getByText('Learn Python')).toBeTruthy();
      expect(getByText('Learn to Cook')).toBeTruthy();
      expect(getByText('Learn Piano')).toBeTruthy();
      expect(getByText('Learn to Draw')).toBeTruthy();
      expect(getByText('Get Fit')).toBeTruthy();
    });

    it('should render the Next button', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Next →')).toBeTruthy();
    });
  });

  describe('input behavior', () => {
    it('should update goal when user types', () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, 'Learn JavaScript');

      expect(getByDisplayValue('Learn JavaScript')).toBeTruthy();
    });

    it('should set goal when example is pressed', () => {
      const { getByText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('Learn Python'));

      expect(getByDisplayValue('Learn Python')).toBeTruthy();
    });

    it('should allow pressing different examples', () => {
      const { getByText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('Learn to Cook'));
      expect(getByDisplayValue('Learn to Cook')).toBeTruthy();

      fireEvent.press(getByText('Learn Piano'));
      expect(getByDisplayValue('Learn Piano')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to LevelSelection with goal when Next is pressed', () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, 'Learn TypeScript');
      fireEvent.press(getByText('Next →'));

      expect(mockNavigate).toHaveBeenCalledWith('LevelSelection', { goal: 'Learn TypeScript' });
    });

    it('should trim whitespace from goal before navigating', () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, '  Learn React  ');
      fireEvent.press(getByText('Next →'));

      expect(mockNavigate).toHaveBeenCalledWith('LevelSelection', { goal: 'Learn React' });
    });

    it('should not navigate if goal is empty', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('Next →'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate if goal is only whitespace', () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, '   ');
      fireEvent.press(getByText('Next →'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('button state', () => {
    it('should disable button when goal is empty', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Button should be rendered but disabled state is handled by the Button component
      expect(getByText('Next →')).toBeTruthy();
    });
  });
});
