import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LessonScreen } from '../LessonScreen';
import type { RootStackParamList } from '../../types/navigation';

// Mock analytics hooks to prevent console.log outputs
jest.mock('../../services/analytics/hooks', () => ({
  useAnalytics: () => ({
    trackScreen: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
    trackSignUp: jest.fn(),
    trackLogin: jest.fn(),
    trackLogout: jest.fn(),
    trackOnboardingStart: jest.fn(),
    trackGoalSelected: jest.fn(),
    trackLevelSelected: jest.fn(),
    trackOnboardingComplete: jest.fn(),
    trackLearningPathCreated: jest.fn(),
    trackLearningPathOpened: jest.fn(),
    trackLearningPathDeleted: jest.fn(),
    trackStepStarted: jest.fn(),
    trackStepCompleted: jest.fn(),
    trackLessonCompleted: jest.fn(),
    trackPracticeCompleted: jest.fn(),
    trackQuizStarted: jest.fn(),
    trackQuizQuestionAnswered: jest.fn(),
    trackQuizCompleted: jest.fn(),
    trackNextStepRequested: jest.fn(),
    trackNextStepGenerated: jest.fn(),
    trackAIError: jest.fn(),
    trackAppOpen: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn(),
    trackThemeChanged: jest.fn(),
    trackProgressViewed: jest.fn(),
    trackDeleteAccountInitiated: jest.fn(),
    getActiveTime: jest.fn(),
  }),
  useScreenTracking: jest.fn(),
  useActiveTime: () => ({
    getActiveSeconds: jest.fn().mockReturnValue(0),
    resetTimer: jest.fn(),
  }),
  useStepTracking: () => ({
    startStep: jest.fn(),
    completeStep: jest.fn().mockResolvedValue(undefined),
    getActiveSeconds: jest.fn().mockReturnValue(0),
  }),
}));

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

// Spy on console.error to suppress expected error logs during tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

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
  type: 'lesson' as const,
  topic: 'Variables',
  title: 'Introduction to Variables',
  content: 'Variables in Python are containers for storing data values. Unlike other programming languages, Python has no command for declaring a variable.',
};

const mockRoute = {
  key: 'Lesson-test',
  name: 'Lesson',
  params: { step: mockStep, pathId: 'test-path-123' },
} as unknown as ScreenRouteProp;

const mockPathResult = {
  path: {
    id: 'test-path-123',
    goal: 'Learn Python',
    level: 'beginner',
    progress: 20,
    lessonsCompleted: 1,
    totalLessons: 5,
    steps: [{ ...mockStep, completed: true }],
  },
};

describe('LessonScreen', () => {
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
    it('should render the lesson emoji', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('📖')).toBeTruthy();
    });

    it('should render the Lesson badge', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Lesson')).toBeTruthy();
    });

    it('should render the lesson title', () => {
      const { getAllByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      const titleElements = getAllByText('Introduction to Variables');
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it('should render the lesson content', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText(/Variables in Python are containers/)).toBeTruthy();
    });

    it('should render I Understand button', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('I Understand →')).toBeTruthy();
    });
  });

  describe('understanding flow', () => {
    it('should call completeStep when I Understand is pressed', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockCompleteStep).toHaveBeenCalledWith('test-path-123', 'step-1');
      });
    });

    it('should update path in store after completing step', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockUpdatePath).toHaveBeenCalledWith('test-path-123', mockPathResult.path);
      });
    });

    it('should set active path in store after completing', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockUpdatePath).toHaveBeenCalledWith('test-path-123', mockPathResult.path);
      });
    });

    it('should refresh user document after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockGetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetUserDocument).toHaveBeenCalled();
      });
    });

    it('should navigate to LearningPath after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('LearningPath', { pathId: 'test-path-123' });
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockCompleteStep.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

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
        type: 'lesson' as const,
        topic: 'Python Basics',
        content: 'Python is a programming language.',
      };

      const route = {
        key: 'Lesson-test',
        name: 'Lesson',
        params: { step: stepWithoutTitle, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getAllByText } = render(
        <LessonScreen navigation={mockNavigation} route={route} />
      );

      const titleElements = getAllByText('Python Basics');
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  describe('different lesson content', () => {
    it('should render long content', () => {
      const longContentStep = {
        id: 'step-3',
        type: 'lesson' as const,
        topic: 'Advanced Topic',
        title: 'A Very Long Lesson',
        content: 'This is a very long content that spans multiple paragraphs. '.repeat(10),
      };

      const route = {
        key: 'Lesson-test',
        name: 'Lesson',
        params: { step: longContentStep, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getAllByText, getByText } = render(
        <LessonScreen navigation={mockNavigation} route={route} />
      );

      const titleElements = getAllByText('A Very Long Lesson');
      expect(titleElements.length).toBeGreaterThan(0);
      expect(getByText(/This is a very long content/)).toBeTruthy();
    });
  });
});
