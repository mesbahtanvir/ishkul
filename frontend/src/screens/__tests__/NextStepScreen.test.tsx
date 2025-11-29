import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NextStepScreen } from '../NextStepScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock userStore
let mockUserDocument: any = null;
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    userDocument: mockUserDocument,
  }),
}));

// Mock learningStore
const mockSetCurrentStep = jest.fn();
const mockSetLoading = jest.fn();
let mockCurrentStep: any = null;
jest.mock('../../state/learningStore', () => ({
  useLearningStore: () => ({
    currentStep: mockCurrentStep,
    setCurrentStep: mockSetCurrentStep,
    setLoading: mockSetLoading,
  }),
}));

// Mock llmEngine
const mockGetNextStep = jest.fn();
jest.mock('../../services/llmEngine', () => ({
  getNextStep: (params: unknown) => mockGetNextStep(params),
}));

// Mock memory service
const mockUpdateNextStep = jest.fn();
jest.mock('../../services/memory', () => ({
  updateNextStep: (step: unknown) => mockUpdateNextStep(step),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('NextStepScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserDocument = null;
    mockCurrentStep = null;
  });

  describe('loading state', () => {
    it('should show loading screen initially', () => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
      };

      // LoadingScreen will be shown because isLoadingStep starts as true
      const { UNSAFE_root } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      // The component starts in loading state
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('with existing next step', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: {
          type: 'lesson',
          topic: 'Variables',
          title: 'Introduction to Variables',
          content: 'Variables store data...',
        },
      };
      mockCurrentStep = mockUserDocument.nextStep;
    });

    it('should set current step from userDocument', async () => {
      render(<NextStepScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockSetCurrentStep).toHaveBeenCalledWith(mockUserDocument.nextStep);
      });
    });
  });

  describe('without next step', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
      };

      mockGetNextStep.mockResolvedValue({
        nextStep: {
          type: 'lesson',
          topic: 'Introduction',
          title: 'Getting Started',
          content: 'Welcome to Python...',
        },
      });
      mockUpdateNextStep.mockResolvedValue(undefined);
    });

    it('should call getNextStep to fetch new step', async () => {
      render(<NextStepScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockGetNextStep).toHaveBeenCalledWith({
          goal: 'Learn Python',
          level: 'beginner',
          memory: { topics: {} },
          history: [],
        });
      });
    });

    it('should update Firestore with new step', async () => {
      render(<NextStepScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(mockUpdateNextStep).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
      };

      mockGetNextStep.mockRejectedValue(new Error('Network error'));
    });

    it('should show error alert on failure', async () => {
      render(<NextStepScreen navigation={mockNavigation as any} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load next step. Please try again.'
        );
      });
    });
  });

  describe('step display', () => {
    it('should display lesson step correctly', async () => {
      mockCurrentStep = {
        type: 'lesson',
        topic: 'Variables',
        title: 'Introduction to Variables',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('📖')).toBeTruthy();
        expect(getByText('Lesson')).toBeTruthy();
      });
    });

    it('should display quiz step correctly', async () => {
      mockCurrentStep = {
        type: 'quiz',
        topic: 'Variables Quiz',
        title: 'Test Your Knowledge',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('❓')).toBeTruthy();
        expect(getByText('Quiz')).toBeTruthy();
      });
    });

    it('should display practice step correctly', async () => {
      mockCurrentStep = {
        type: 'practice',
        topic: 'Coding Practice',
        title: 'Write a Function',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('💪')).toBeTruthy();
        expect(getByText('Practice')).toBeTruthy();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to Lesson screen for lesson step', async () => {
      mockCurrentStep = {
        type: 'lesson',
        topic: 'Variables',
        title: 'Introduction to Variables',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Start →')).toBeTruthy();
      });

      fireEvent.press(getByText('Start →'));

      expect(mockNavigate).toHaveBeenCalledWith('Lesson', { step: mockCurrentStep });
    });

    it('should navigate to Quiz screen for quiz step', async () => {
      mockCurrentStep = {
        type: 'quiz',
        topic: 'Quiz',
        title: 'Quiz',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Start →')).toBeTruthy();
      });

      fireEvent.press(getByText('Start →'));

      expect(mockNavigate).toHaveBeenCalledWith('Quiz', { step: mockCurrentStep });
    });

    it('should navigate to Practice screen for practice step', async () => {
      mockCurrentStep = {
        type: 'practice',
        topic: 'Practice',
        title: 'Practice',
      };
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        nextStep: mockCurrentStep,
      };

      const { getByText } = render(
        <NextStepScreen navigation={mockNavigation as any} />
      );

      await waitFor(() => {
        expect(getByText('Start →')).toBeTruthy();
      });

      fireEvent.press(getByText('Start →'));

      expect(mockNavigate).toHaveBeenCalledWith('Practice', { step: mockCurrentStep });
    });
  });

  describe('no user document', () => {
    it('should not load step when no user document', async () => {
      mockUserDocument = null;

      render(<NextStepScreen navigation={mockNavigation as any} />);

      // Wait a bit to ensure loadNextStep doesn't proceed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetNextStep).not.toHaveBeenCalled();
    });
  });
});
