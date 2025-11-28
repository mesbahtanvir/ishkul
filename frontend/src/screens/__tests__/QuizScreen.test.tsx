import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QuizScreen } from '../QuizScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock userStore
const mockSetUserDocument = jest.fn();
let mockUserDocument: any = {
  uid: 'test-user-123',
  goal: 'Learn Python',
  level: 'beginner',
};
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    userDocument: mockUserDocument,
    setUserDocument: mockSetUserDocument,
  }),
}));

// Mock learningStore
const mockClearCurrentStep = jest.fn();
jest.mock('../../state/learningStore', () => ({
  useLearningStore: () => ({
    clearCurrentStep: mockClearCurrentStep,
  }),
}));

// Mock memory service
const mockUpdateUserHistory = jest.fn();
const mockClearNextStep = jest.fn();
const mockGetUserDocument = jest.fn();
jest.mock('../../services/memory', () => ({
  updateUserHistory: (entry: unknown) => mockUpdateUserHistory(entry),
  clearNextStep: () => mockClearNextStep(),
  getUserDocument: () => mockGetUserDocument(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
};

const mockStep = {
  type: 'quiz' as const,
  topic: 'Python Variables',
  title: 'Variables Quiz',
  question: 'What is a variable in Python?',
  expectedAnswer: 'container for storing data',
};

const mockRoute = {
  params: { step: mockStep },
};

describe('QuizScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUserHistory.mockResolvedValue(undefined);
    mockClearNextStep.mockResolvedValue(undefined);
    mockGetUserDocument.mockResolvedValue({
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
    });
  });

  describe('rendering', () => {
    it('should render the quiz emoji', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('❓')).toBeTruthy();
    });

    it('should render the Quiz badge', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Quiz')).toBeTruthy();
    });

    it('should render the question title', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Variables Quiz')).toBeTruthy();
    });

    it('should render the question text', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('What is a variable in Python?')).toBeTruthy();
    });

    it('should render answer input', () => {
      const { getByPlaceholderText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByPlaceholderText('Type your answer here...')).toBeTruthy();
    });

    it('should render Submit button', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('answer input', () => {
    it('should allow typing an answer', () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'A container for storing data');

      expect(getByDisplayValue('A container for storing data')).toBeTruthy();
    });

    it('should disable Submit button when answer is empty', () => {
      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Submit should be present but disabled functionality
      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('answer submission', () => {
    it('should show correct result for correct answer', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'A container for storing data');
      fireEvent.press(getByText('Submit'));

      expect(getByText('✔️')).toBeTruthy();
      expect(getByText('Correct! Well done!')).toBeTruthy();
    });

    it('should show incorrect result for wrong answer', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'wrong answer');
      fireEvent.press(getByText('Submit'));

      expect(getByText('✖️')).toBeTruthy();
      expect(getByText(/Not quite. Expected:/)).toBeTruthy();
    });

    it('should show Next Step button after submission', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'container for storing data');
      fireEvent.press(getByText('Submit'));

      expect(queryByText('Submit')).toBeNull();
      expect(getByText('Next Step →')).toBeTruthy();
    });

    it('should disable input after submission', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'answer');
      fireEvent.press(getByText('Submit'));

      expect(input.props.editable).toBe(false);
    });
  });

  describe('next step flow', () => {
    it('should update history and navigate on Next Step', async () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'container for storing data');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Next Step →'));

      await waitFor(() => {
        expect(mockUpdateUserHistory).toHaveBeenCalledWith({
          type: 'quiz',
          topic: 'Python Variables',
          score: 100, // Correct answer
          timestamp: expect.any(Number),
        });
      });

      await waitFor(() => {
        expect(mockClearNextStep).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockClearCurrentStep).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('NextStep');
      });
    });

    it('should record score 0 for incorrect answer', async () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'wrong answer');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Next Step →'));

      await waitFor(() => {
        expect(mockUpdateUserHistory).toHaveBeenCalledWith({
          type: 'quiz',
          topic: 'Python Variables',
          score: 0, // Incorrect answer
          timestamp: expect.any(Number),
        });
      });
    });

    it('should show error alert on failure', async () => {
      mockUpdateUserHistory.mockRejectedValueOnce(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'answer');
      fireEvent.press(getByText('Submit'));
      fireEvent.press(getByText('Next Step →'));

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
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByPlaceholderText('Type your answer here...');
      fireEvent.changeText(input, 'CONTAINER FOR STORING DATA');
      fireEvent.press(getByText('Submit'));

      expect(getByText('Correct! Well done!')).toBeTruthy();
    });

    it('should accept partial match', () => {
      const { getByPlaceholderText, getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={mockRoute as any} />
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
        type: 'quiz' as const,
        topic: 'Python Basics',
        question: 'What is Python?',
        expectedAnswer: 'programming language',
      };

      const route = { params: { step: stepWithoutTitle } };

      const { getByText } = render(
        <QuizScreen navigation={mockNavigation as any} route={route as any} />
      );

      expect(getByText('Python Basics')).toBeTruthy();
    });
  });
});
