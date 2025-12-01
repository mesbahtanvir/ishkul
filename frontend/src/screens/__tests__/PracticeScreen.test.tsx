import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PracticeScreen } from '../PracticeScreen';
import { RootStackParamList } from '../../types/navigation';

type MockNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList, 'Practice'>,
  'navigate' | 'replace' | 'goBack'
>;
type MockRoute = RouteProp<RootStackParamList, 'Practice'>;

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
const mockSetCurrentStep = jest.fn();
jest.mock('../../state/learningPathsStore', () => ({
  useLearningPathsStore: () => ({
    updatePath: mockUpdatePath,
    setCurrentStep: mockSetCurrentStep,
  }),
}));

// Mock memory service
const mockCompletePathStep = jest.fn();
const mockGetUserDocument = jest.fn();
jest.mock('../../services/memory', () => ({
  completePathStep: (...args: unknown[]) => mockCompletePathStep(...args),
  getUserDocument: () => mockGetUserDocument(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation: MockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
};

const mockStep = {
  type: 'practice' as const,
  topic: 'Python Functions',
  title: 'Write Your First Function',
  task: 'Create a function called greet that takes a name parameter and returns a greeting message.',
};

const mockRoute: MockRoute = {
  key: 'Practice-test',
  name: 'Practice',
  params: { step: mockStep, pathId: 'test-path-123' },
};

const mockPathResult = {
  path: {
    id: 'test-path-123',
    goal: 'Learn Python',
    level: 'beginner',
    progress: 60,
    lessonsCompleted: 3,
    totalLessons: 5,
  },
  nextStep: {
    type: 'lesson',
    topic: 'Advanced Functions',
    title: 'Function Arguments',
    content: 'Learn about different types of function arguments.',
  },
};

describe('PracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompletePathStep.mockResolvedValue(mockPathResult);
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
    it('should call completePathStep when Done is pressed', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockCompletePathStep).toHaveBeenCalledWith('test-path-123', {
          type: 'practice',
          topic: 'Python Functions',
        });
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

    it('should set current step in store after completing', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockSetCurrentStep).toHaveBeenCalledWith('test-path-123', mockPathResult.nextStep);
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

    it('should navigate to LearningSession after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('LearningSession', { pathId: 'test-path-123' });
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockCompletePathStep.mockRejectedValueOnce(new Error('Network error'));

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
        type: 'practice' as const,
        topic: 'Advanced Python',
        task: 'Practice advanced concepts.',
      };

      const route: MockRoute = {
        key: 'Practice-test',
        name: 'Practice',
        params: { step: stepWithoutTitle, pathId: 'test-path-123' },
      };

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

      const route: MockRoute = {
        key: 'Practice-test',
        name: 'Practice',
        params: { step: differentStep, pathId: 'test-path-123' },
      };

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Create a Component')).toBeTruthy();
      expect(getByText(/Build a reusable button component/)).toBeTruthy();
    });
  });
});
