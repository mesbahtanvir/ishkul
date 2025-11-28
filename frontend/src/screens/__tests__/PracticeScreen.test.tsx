import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PracticeScreen } from '../PracticeScreen';

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
  type: 'practice' as const,
  topic: 'Python Functions',
  title: 'Write Your First Function',
  task: 'Create a function called greet that takes a name parameter and returns a greeting message.',
};

const mockRoute = {
  params: { step: mockStep },
};

describe('PracticeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserDocument = {
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
    };
    mockUpdateUserHistory.mockResolvedValue(undefined);
    mockClearNextStep.mockResolvedValue(undefined);
    mockGetUserDocument.mockResolvedValue({
      uid: 'test-user-123',
      goal: 'Learn Python',
      level: 'beginner',
    });
  });

  describe('rendering', () => {
    it('should render the practice emoji', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('💪')).toBeTruthy();
    });

    it('should render the Practice badge', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Practice')).toBeTruthy();
    });

    it('should render the practice title', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Write Your First Function')).toBeTruthy();
    });

    it('should render Your Task label', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Your Task:')).toBeTruthy();
    });

    it('should render the task description', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText(/Create a function called greet/)).toBeTruthy();
    });

    it('should render tips section', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('💡 Tips:')).toBeTruthy();
      expect(getByText(/Take your time/)).toBeTruthy();
      expect(getByText(/Try it yourself first/)).toBeTruthy();
      expect(getByText(/Don't worry about making mistakes/)).toBeTruthy();
      expect(getByText(/Mark as done when you've practiced/)).toBeTruthy();
    });

    it('should render I\'m Done button', () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText("I'm Done →")).toBeTruthy();
    });
  });

  describe('done flow', () => {
    it('should update history when Done is pressed', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockUpdateUserHistory).toHaveBeenCalledWith({
          type: 'practice',
          topic: 'Python Functions',
          timestamp: expect.any(Number),
        });
      });
    });

    it('should clear next step after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockClearNextStep).toHaveBeenCalled();
      });
    });

    it('should update user document after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockGetUserDocument).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetUserDocument).toHaveBeenCalled();
      });
    });

    it('should clear current step after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockClearCurrentStep).toHaveBeenCalled();
      });
    });

    it('should navigate to NextStep after done', async () => {
      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('NextStep');
      });
    });
  });

  describe('error handling', () => {
    it('should show error alert on failure', async () => {
      mockUpdateUserHistory.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save progress. Please try again.'
        );
      });
    });

    it('should not proceed when no user document', async () => {
      mockUserDocument = null;

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText("I'm Done →"));

      expect(mockUpdateUserHistory).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('step with topic as title fallback', () => {
    it('should use topic when title is not provided', () => {
      const stepWithoutTitle = {
        type: 'practice' as const,
        topic: 'Advanced Python',
        task: 'Practice advanced concepts.',
      };

      const route = { params: { step: stepWithoutTitle } };

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={route as any} />
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

      const route = { params: { step: differentStep } };

      const { getByText } = render(
        <PracticeScreen navigation={mockNavigation as any} route={route as any} />
      );

      expect(getByText('Create a Component')).toBeTruthy();
      expect(getByText(/Build a reusable button component/)).toBeTruthy();
    });
  });
});
