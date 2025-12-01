import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { PracticeScreen } from '../PracticeScreen';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Practice'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Practice'>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock userStore
const mockSetUserDocument = jest.fn();
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    setUserDocument: mockSetUserDocument,
  }),
}));

// Mock learningPathsStore
const mockUpdatePath = jest.fn();
const mockSetActivePath = jest.fn();
jest.mock('../../state/learningPathsStore', () => ({
  useLearningPathsStore: () => ({
    updatePath: mockUpdatePath,
    setActivePath: mockSetActivePath,
  }),
}));

// Mock memory service
const mockCompleteStep = jest.fn();
const mockGetUserDocument = jest.fn();
jest.mock('../../services/memory', () => ({
  completeStep: (...args: unknown[]) => mockCompleteStep(...args),
  getUserDocument: () => mockGetUserDocument(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
} as unknown as NavigationProp;

const mockStep = {
  id: 'step-1',
  type: 'practice' as const,
  topic: 'Python Functions',
  title: 'Write Your First Function',
  task: 'Create a function called greet that takes a name parameter and returns a greeting message.',
};

const mockRoute = {
  key: 'Practice-test',
  name: 'Practice',
  params: { step: mockStep, pathId: 'test-path-123' },
} as unknown as ScreenRouteProp;

const mockPathResult = {
  path: {
    id: 'test-path-123',
    goal: 'Learn Python',
    level: 'beginner',
    progress: 60,
    lessonsCompleted: 3,
    totalLessons: 5,
    steps: [{ ...mockStep, completed: true }],
  },
};

describe('PracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteStep.mockResolvedValue(mockPathResult);
    mockGetUserDocument.mockResolvedValue({
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
      learningPaths: [],
    });
  });

  describe('rendering', () => {
    it('should render the practice emoji', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('💪')).toBeTruthy();
    });

    it('should render the Practice badge', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Practice')).toBeTruthy();
    });

    it('should render the practice title', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Write Your First Function')).toBeTruthy();
    });

    it('should render Your Task label', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Your Task:')).toBeTruthy();
    });

    it('should render the task description', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText(/Create a function called greet/)).toBeTruthy();
    });

    it('should render tips section', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('💡 Tips:')).toBeTruthy();
      expect(getByText(/Take your time/)).toBeTruthy();
      expect(getByText(/Try it yourself first/)).toBeTruthy();
      expect(getByText(/Don't worry about making mistakes/)).toBeTruthy();
      expect(getByText(/Mark as done when you've practiced/)).toBeTruthy();
    });

    it('should render I\'m Done button', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText("I'm Done →")).toBeTruthy();
    });
  });

  describe('done flow', () => {
    it('should call completeStep when Done is pressed', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockCompleteStep).toHaveBeenCalledWith('test-path-123', 'step-1');
      });
    });

    it('should update path in store after completing', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockUpdatePath).toHaveBeenCalledWith('test-path-123', mockPathResult.path);
      });
    });

    it('should set active path in store after completing', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockUpdatePath).toHaveBeenCalledWith('test-path-123', mockPathResult.path);
      });
    });

    it('should refresh user document after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockGetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetUserDocument).toHaveBeenCalled();
      });
    });

    it('should navigate to LearningPath after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('LearningPath', { pathId: 'test-path-123' });
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockCompleteStep.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save progress. Please try again.'
        );
      });
    });
  });

  describe('step with topic as title fallback', () => {
    it('should use topic when title is not provided', () => {
      const stepWithoutTitle = {
        id: 'step-2',
        type: 'practice' as const,
        topic: 'Advanced Python',
        task: 'Practice advanced concepts.',
      };

      const route = {
        key: 'Practice-test',
        name: 'Practice',
        params: { step: stepWithoutTitle, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Advanced Python')).toBeTruthy();
    });
  });

  describe('different practice tasks', () => {
    it('should render different task content', () => {
      const differentStep = {
        type: 'practice' as const,
        topic: 'React Components',
        title: 'Create a Component',
        task: 'Build a reusable button component with props for variant and size.',
      };

      const route = {
        key: 'Practice-test',
        name: 'Practice',
        params: { step: differentStep, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Create a Component')).toBeTruthy();
      expect(getByText(/Build a reusable button component/)).toBeTruthy();
    });
  });
});
