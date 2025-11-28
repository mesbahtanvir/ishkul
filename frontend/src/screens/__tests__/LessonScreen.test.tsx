import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LessonScreen } from '../LessonScreen';

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
  type: 'lesson' as const,
  topic: 'Variables',
  title: 'Introduction to Variables',
  content: 'Variables in Python are containers for storing data values. Unlike other programming languages, Python has no command for declaring a variable.',
};

const mockRoute = {
  params: { step: mockStep },
};

describe('LessonScreen', () => {
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
    it('should render the lesson emoji', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('📖')).toBeTruthy();
    });

    it('should render the Lesson badge', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Lesson')).toBeTruthy();
    });

    it('should render the lesson title', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Introduction to Variables')).toBeTruthy();
    });

    it('should render the lesson content', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText(/Variables in Python are containers/)).toBeTruthy();
    });

    it('should render I Understand button', () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('I Understand →')).toBeTruthy();
    });
  });

  describe('understanding flow', () => {
    it('should update history when I Understand is pressed', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockUpdateUserHistory).toHaveBeenCalledWith({
          type: 'lesson',
          topic: 'Variables',
          timestamp: expect.any(Number),
        });
      });
    });

    it('should clear next step after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockClearNextStep).toHaveBeenCalled();
      });
    });

    it('should update user document after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockGetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetUserDocument).toHaveBeenCalled();
      });
    });

    it('should clear current step after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockClearCurrentStep).toHaveBeenCalled();
      });
    });

    it('should navigate to NextStep after understanding', async () => {
      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('NextStep');
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockUpdateUserHistory.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save progress. Please try again.'
        );
      });
    });

    it('should not navigate when no user document', async () => {
      mockUserDocument = null;

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText('I Understand →'));

      // Should return early without calling any services
      expect(mockUpdateUserHistory).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('step with topic as title fallback', () => {
    it('should use topic when title is not provided', () => {
      const stepWithoutTitle = {
        type: 'lesson' as const,
        topic: 'Python Basics',
        content: 'Python is a programming language.',
      };

      const route = { params: { step: stepWithoutTitle } };

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={route as any} />
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

      const route = { params: { step: longContentStep } };

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation as any} route={route as any} />
      );

      expect(getByText('A Very Long Lesson')).toBeTruthy();
      expect(getByText(/This is a very long content/)).toBeTruthy();
    });
  });
});
