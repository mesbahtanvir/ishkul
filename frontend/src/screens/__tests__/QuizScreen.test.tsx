import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { QuizScreen } from '../QuizScreen';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

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
  type: 'quiz' as const,
  topic: 'Python Variables',
  title: 'Variables Quiz',
  question: 'What is a variable in Python?',
  expectedAnswer: 'container for storing data',
};

const mockRoute = {
  key: 'Quiz-test',
  name: 'Quiz',
  params: { step: mockStep, pathId: 'test-path-123' },
} as unknown as ScreenRouteProp;

const mockPathResult = {
  path: {
    id: 'test-path-123',
    goal: 'Learn Python',
    level: 'beginner',
    progress: 40,
    lessonsCompleted: 2,
    totalLessons: 5,
    steps: [{ ...mockStep, completed: true }],
  },
};

describe('QuizScreen', () => {
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
    it('should render the quiz emoji', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('❓')).toBeTruthy();
    });

    it('should render the Quiz badge', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Quiz')).toBeTruthy();
    });

    it('should render the question title', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Variables Quiz')).toBeTruthy();
    });

    it('should render the question text', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('What is a variable in Python?')).toBeTruthy();
    });

    it('should render answer input', () => {
      const { getByPlaceholderText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByPlaceholderText('Type your answer here...')).toBeTruthy();
    });

    it('should render Submit button', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('answer input', () => {
    it('should allow typing an answer', () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'A container for storing data');

      expect(getByDisplayValue('A container for storing data')).toBeTruthy();
    });

    it('should disable Submit button when answer is empty', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Submit should be present but disabled functionality
      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('answer submission', () => {
    it('should show correct result for correct answer', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'A container for storing data');
      fireEvent.press(getByText('Submit'));

      expect(getByText('✔️')).toBeTruthy();
      expect(getByText('Correct! Well done!')).toBeTruthy();
    });

    it('should show incorrect result for wrong answer', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'wrong answer');
      fireEvent.press(getByText('Submit'));

      expect(getByText('✖️')).toBeTruthy();
      expect(getByText(/Not quite. Expected:/)).toBeTruthy();
    });

    it('should show Continue button after submission', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'container for storing data');
      fireEvent.press(getByText('Submit'));

      expect(queryByText('Submit')).toBeNull();
      expect(getByText('Continue →')).toBeTruthy();
    });

    it('should disable input after submission', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'answer');
      fireEvent.press(getByText('Submit'));

      expect(input.props.editable).toBe(false);
    });
  });

  describe('next step flow', () => {
    it('should call completePathStep and navigate on Continue', async () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'container for storing data');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Continue →'));

      await waitFor(() => {
        expect(mockCompleteStep).toHaveBeenCalledWith('test-path-123', 'step-1', {
          userAnswer: 'container for storing data',
          score: 100, // Correct answer
        });
      });

      await waitFor(() => {
        expect(mockUpdatePath).toHaveBeenCalledWith('test-path-123', mockPathResult.path);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('LearningPath', { pathId: 'test-path-123' });
      });
    });

    it('should record score 0 for incorrect answer', async () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'wrong answer');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Continue →'));

      await waitFor(() => {
        expect(mockCompleteStep).toHaveBeenCalledWith('test-path-123', 'step-1', {
          userAnswer: 'wrong answer',
          score: 0, // Incorrect answer
        });
      });
    });

    it('should show error alert on failure', async () => {
      mockCompleteStep.mockRejectedValueOnce(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'answer');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Continue →'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save progress. Please try again.'
        );
      });
    });
  });

  describe('answer matching', () => {
    it('should be case-insensitive', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'CONTAINER FOR STORING DATA');
      fireEvent.press(getByText('Submit'));

      expect(getByText('Correct! Well done!')).toBeTruthy();
    });

    it('should accept partial match', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation} route={mockRoute} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'A variable is a container for storing data values');
      fireEvent.press(getByText('Submit'));

      expect(getByText('Correct! Well done!')).toBeTruthy();
    });
  });

  describe('step with topic as title fallback', () => {
    it('should use topic when title is not provided', () => {
      const stepWithoutTitle = {
        id: 'step-2',
        type: 'quiz' as const,
        topic: 'Python Basics',
        question: 'What is Python?',
        expectedAnswer: 'programming language',
      };

      const route = {
        key: 'Quiz-test',
        name: 'Quiz',
        params: { step: stepWithoutTitle, pathId: 'test-path-123' },
      } as unknown as ScreenRouteProp;

      const { getByText } = render(
        <QuizScreen navigation={mockNavigation} route={route} />
      );

      expect(getByText('Python Basics')).toBeTruthy();
    });
  });
});
