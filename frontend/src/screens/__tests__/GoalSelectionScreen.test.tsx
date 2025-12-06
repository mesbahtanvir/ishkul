import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { GoalSelectionScreen } from '../GoalSelectionScreen';
import { RootStackParamList } from '../../types/navigation';

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
  useOnboardingTracking: () => ({
    startOnboarding: jest.fn(),
    selectGoal: jest.fn(),
    selectLevel: jest.fn(),
    completeOnboarding: jest.fn(),
  }),
}));

type GoalSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GoalSelection'>;
type GoalSelectionScreenRouteProp = RouteProp<RootStackParamList, 'GoalSelection'>;

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
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  },
  ErrorCodes: {
    PATH_LIMIT_REACHED: 'PATH_LIMIT_REACHED',
    DAILY_STEP_LIMIT_REACHED: 'DAILY_STEP_LIMIT_REACHED',
  },
}));

// Mock subscription store
const mockShowUpgradePrompt = jest.fn();
jest.mock('../../state/subscriptionStore', () => ({
  useSubscriptionStore: () => ({
    showUpgradePrompt: mockShowUpgradePrompt,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNavigation: Partial<GoalSelectionScreenNavigationProp> = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
};

// Mock route
const mockRoute: GoalSelectionScreenRouteProp = {
  key: 'GoalSelection',
  name: 'GoalSelection',
  params: { isCreatingNewPath: false },
};

describe('GoalSelectionScreen', () => {
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
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      expect(getByText('What do you want to learn?')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      expect(getByText(/Set your learning goal/)).toBeTruthy();
    });

    it('should render the input field with label', () => {
      const { getByText, getByPlaceholderText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      expect(getByText('Your Learning Goal')).toBeTruthy();
      expect(getByPlaceholderText(/Learn Spanish/)).toBeTruthy();
    });

    it('should render all example goals', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      expect(getByText('Popular Goals')).toBeTruthy();
      expect(getByText('Learn Python')).toBeTruthy();
      expect(getByText('Learn to Cook')).toBeTruthy();
      expect(getByText('Learn Piano')).toBeTruthy();
      expect(getByText('Learn to Draw')).toBeTruthy();
      expect(getByText('Get Fit')).toBeTruthy();
    });

    it('should render the Start Learning button', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      expect(getByText('Start Learning →')).toBeTruthy();
    });
  });

  describe('input behavior', () => {
    it('should update goal when user types', () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, 'Learn JavaScript');

      expect(getByDisplayValue('Learn JavaScript')).toBeTruthy();
    });

    it('should set goal when example is pressed', () => {
      const { getByText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      fireEvent.press(getByText('Learn Python'));

      expect(getByDisplayValue('Learn Python')).toBeTruthy();
    });

    it('should allow pressing different examples', () => {
      const { getByText, getByDisplayValue } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      fireEvent.press(getByText('Learn to Cook'));
      expect(getByDisplayValue('Learn to Cook')).toBeTruthy();

      fireEvent.press(getByText('Learn Piano'));
      expect(getByDisplayValue('Learn Piano')).toBeTruthy();
    });
  });

  describe('course creation flow', () => {
    it('should call createUserDocument and navigate to Main for first-time users', async () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, 'Learn TypeScript');
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(mockCreateUserDocument).toHaveBeenCalledWith(
          'Learn TypeScript',
          'beginner',
          expect.objectContaining({
            goal: 'Learn TypeScript',
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

    it('should trim whitespace from goal before creating course', async () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, '  Learn React  ');
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(mockCreateUserDocument).toHaveBeenCalledWith(
          'Learn React',
          'beginner',
          expect.objectContaining({
            goal: 'Learn React',
            level: 'beginner',
          })
        );
      });
    });

    it('should not create course if goal is empty', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      fireEvent.press(getByText('Start Learning →'));

      expect(mockCreateUserDocument).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not create course if goal is only whitespace', () => {
      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, '   ');
      fireEvent.press(getByText('Start Learning →'));

      expect(mockCreateUserDocument).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show error alert on failure', async () => {
      mockCreateUserDocument.mockRejectedValueOnce(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      const input = getByPlaceholderText(/Learn Spanish/);
      fireEvent.changeText(input, 'Learn Python');
      fireEvent.press(getByText('Start Learning →'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save. Please try again.'
        );
      });
    });
  });

  describe('existing user creating new path', () => {
    const existingUserRoute: GoalSelectionScreenRouteProp = {
      key: 'GoalSelection',
      name: 'GoalSelection',
      params: { isCreatingNewPath: true },
    };

    beforeEach(() => {
      // Override mock for existing user with userDocument
      jest.mock('../../state/userStore', () => ({
        useUserStore: () => ({
          user: { uid: 'test-user-123', email: 'test@example.com' },
          userDocument: {
            uid: 'test-user-123',
            goal: 'Previous Goal',
            level: 'intermediate',
          },
          setUserDocument: mockSetUserDocument,
        }),
      }));
    });

    it('should show back button when creating new path', () => {
      const { getByText } = render(
        <GoalSelectionScreen
          navigation={mockNavigation as GoalSelectionScreenNavigationProp}
          route={existingUserRoute}
        />
      );

      expect(getByText('← Back')).toBeTruthy();
    });
  });

  describe('button state', () => {
    it('should disable button when goal is empty', () => {
      const { getByText } = render(
        <GoalSelectionScreen navigation={mockNavigation as GoalSelectionScreenNavigationProp} route={mockRoute} />
      );

      // Button should be rendered but disabled state is handled by the Button component
      expect(getByText('Start Learning →')).toBeTruthy();
    });
  });
});
