import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LevelSelectionScreen } from '../LevelSelectionScreen';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LevelSelection'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'LevelSelection'>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock userStore
const mockSetUserDocument = jest.fn();
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    userDocument: null,
    setUserDocument: mockSetUserDocument,
  }),
}));

// Mock learningPathsStore
const mockAddPath = jest.fn();
jest.mock('../../state/learningPathsStore', () => ({
  useLearningPathsStore: () => ({
    addPath: mockAddPath,
  }),
  getEmojiForGoal: () => '🐍',
  generatePathId: () => 'test-path-id',
}));

// Mock memory service
const mockCreateUserDocument = jest.fn();
const mockGetUserDocument = jest.fn();
const mockAddLearningPath = jest.fn();
jest.mock('../../services/memory', () => ({
  createUserDocument: (...args: unknown[]) => mockCreateUserDocument(...args),
  getUserDocument: () => mockGetUserDocument(),
  addLearningPath: (...args: unknown[]) => mockAddLearningPath(...args),
}));

// Mock api service
const mockGetPaths = jest.fn();
jest.mock('../../services/api', () => ({
  learningPathsApi: {
    getPaths: () => mockGetPaths(),
  },
}));

// Mock navigation
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
} as unknown as NavigationProp;

const mockRoute = {
  key: 'LevelSelection-test',
  name: 'LevelSelection',
  params: { goal: 'Learn Python', isCreatingNewPath: false },
} as unknown as ScreenRouteProp;

describe('LevelSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUserDocument.mockResolvedValue(undefined);
    mockGetUserDocument.mockResolvedValue({
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
      learningPaths: [],
    });
    mockGetPaths.mockResolvedValue([
      {
        id: 'created-path-123',
        goal: 'Learn Python',
        level: 'beginner',
        emoji: '🐍',
        progress: 0,
        lessonsCompleted: 0,
        totalLessons: 10,
        steps: [],
      },
    ]);
  });

  describe('rendering', () => {
    it('should render the title', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      expect(getByText('Choose your level')).toBeTruthy();
    });

    it('should display the goal from route params', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      expect(getByText('Learn Python')).toBeTruthy();
    });

    it('should render all level options', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
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
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      expect(getByText('Start Learning →')).toBeTruthy();
    });

    it('should render level emojis', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
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
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      fireEvent.press(getByText('Beginner'));
      // Level should be selectable
      expect(getByText('Beginner')).toBeTruthy();
    });

    it('should allow selecting intermediate level', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      fireEvent.press(getByText('Intermediate'));
      expect(getByText('Intermediate')).toBeTruthy();
    });

    it('should allow selecting advanced level', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      fireEvent.press(getByText('Advanced'));
      expect(getByText('Advanced')).toBeTruthy();
    });

    it('should allow changing selection', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
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
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      fireEvent.press(getByText('Beginner'));
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(mockCreateUserDocument).toHaveBeenCalledWith(
          'Learn Python',
          'beginner',
          expect.objectContaining({
            goal: 'Learn Python',
            level: 'beginner',
            emoji: '🐍',
          })
        );
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
          navigation={mockNavigation}
          route={mockRoute}
        />
      );

      fireEvent.press(getByText('Intermediate'));
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save. Please try again.'
        );
      });
    });

    it('should not navigate if no level is selected', () => {
      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={mockRoute}
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
        key: 'LevelSelection-test',
        name: 'LevelSelection',
        params: { goal: 'Master Machine Learning', isCreatingNewPath: false },
      } as unknown as ScreenRouteProp;

      const { getByText } = render(
        <LevelSelectionScreen
          navigation={mockNavigation}
          route={customRoute}
        />
      );

      expect(getByText('Master Machine Learning')).toBeTruthy();
    });
  });
});
