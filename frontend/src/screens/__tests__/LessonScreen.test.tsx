import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LessonScreen } from '../LessonScreen';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

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
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
} as unknown as NavigationProp;

const mockStep = {
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
  },
  nextStep: {
    type: 'quiz',
    topic: 'Variables Quiz',
    title: 'Test Your Knowledge',
    question: 'What is a variable?',
    expectedAnswer: 'container for data',
  },
};

describe('LessonScreen', () => {
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
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Introduction to Variables')).toBeTruthy();
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
    it('should call completePathStep when I Understand is pressed', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockCompletePathStep).toHaveBeenCalledWith('test-path-123', {
          type: 'lesson',
          topic: 'Variables',
        });
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

    it('should set current step in store after completing', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockSetCurrentStep).toHaveBeenCalledWith('test-path-123', mockPathResult.nextStep);
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

    it('should navigate to LearningSession after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('LearningSession', { pathId: 'test-path-123' });
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockCompletePathStep.mockRejectedValueOnce(new Error('Network error'));

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
        type: 'lesson' as const,
        topic: 'Python Basics',
        content: 'Python is a programming language.',
      };

      const route = {
        key: 'Lesson-test',
        name: 'Lesson',
        params: { step: stepWithoutTitle, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Python Basics')).toBeTruthy();
    });
  });

  describe('different lesson content', () => {
    it('should render long content', () => {
      const longContentStep = {
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

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('A Very Long Lesson')).toBeTruthy();
      expect(getByText(/This is a very long content/)).toBeTruthy();
    });
  });
});
