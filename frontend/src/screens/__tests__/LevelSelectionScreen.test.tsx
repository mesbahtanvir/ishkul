import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LevelSelectionScreen } from '../LevelSelectionScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock userStore
const mockSetUserDocument = jest.fn();
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    setUserDocument: mockSetUserDocument,
  }),
}));

// Mock memory service
const mockCreateUserDocument = jest.fn();
const mockGetUserDocument = jest.fn();
jest.mock('../../services/memory', () => ({
  createUserDocument: (...args: unknown[]) => mockCreateUserDocument(...args),
  getUserDocument: () => mockGetUserDocument(),
}));

// Mock navigation
const mockReplace = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  replace: mockReplace,
  goBack: jest.fn(),
};

const mockRoute = {
  params: { goal: 'Learn Python' },
};

describe('LevelSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUserDocument.mockResolvedValue(undefined);
    mockGetUserDocument.mockResolvedValue({
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
    });
  });

  describe('rendering', () => {
    it('should render the title', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Choose your level')).toBeTruthy();
    });

    it('should display the goal from route params', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Learn Python')).toBeTruthy();
    });

    it('should render all level options', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Beginner')).toBeTruthy();
      expect(getByText('Starting from the basics')).toBeTruthy();

      expect(getByText('Intermediate')).toBeTruthy();
      expect(getByText('Have some foundation knowledge')).toBeTruthy();

      expect(getByText('Advanced')).toBeTruthy();
      expect(getByText('Ready for complex topics')).toBeTruthy();
    });

    it('should render the start button', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Start Learning →')).toBeTruthy();
    });

    it('should render level emojis', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('🌱')).toBeTruthy();
      expect(getByText('🌿')).toBeTruthy();
      expect(getByText('🌳')).toBeTruthy();
    });
  });

  describe('level selection', () => {
    it('should allow selecting beginner level', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Beginner'));
      // Level should be selectable
      expect(getByText('Beginner')).toBeTruthy();
    });

    it('should allow selecting intermediate level', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Intermediate'));
      expect(getByText('Intermediate')).toBeTruthy();
    });

    it('should allow selecting advanced level', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Advanced'));
      expect(getByText('Advanced')).toBeTruthy();
    });

    it('should allow changing selection', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Beginner'));
      fireEvent.press(getByText('Advanced'));

      // Both levels should still be visible (selection just changes)
      expect(getByText('Beginner')).toBeTruthy();
      expect(getByText('Advanced')).toBeTruthy();
    });
  });

  describe('confirmation flow', () => {
    it('should call createUserDocument and navigate on confirm', async () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Beginner'));
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(mockCreateUserDocument).toHaveBeenCalledWith('Learn Python', 'beginner');
      });

      await waitFor(() => {
        expect(mockGetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('Main');
      });
    });

    it('should show error alert on failure', async () => {
      mockCreateUserDocument.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Intermediate'));
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save your profile. Please try again.'
        );
      });
    });

    it('should not navigate if no level is selected', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText('Start Learning →'));

      expect(mockCreateUserDocument).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('with different goals', () => {
    it('should display custom goal', () => {
      const customRoute = {
        params: { goal: 'Master Machine Learning' },
      };

      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation as any}
          route={customRoute as any}
        />
      );

      expect(getByText('Master Machine Learning')).toBeTruthy();
    });
  });
});
