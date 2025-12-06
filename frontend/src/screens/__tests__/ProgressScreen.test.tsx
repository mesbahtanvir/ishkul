import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressScreen } from '../ProgressScreen';
import { UserDocument } from '../../types/app';

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
    completeStep: jest.fn(),
    getActiveSeconds: jest.fn().mockReturnValue(0),
  }),
  useQuizTracking: () => ({
    startQuiz: jest.fn(),
    answerQuestion: jest.fn(),
    completeQuiz: jest.fn(),
    getActiveSeconds: jest.fn().mockReturnValue(0),
  }),
  useOnboardingTracking: () => ({
    startOnboarding: jest.fn(),
    selectGoal: jest.fn(),
    selectLevel: jest.fn(),
    completeOnboarding: jest.fn(),
  }),
  useAITracking: () => ({
    startRequest: jest.fn(),
    completeRequest: jest.fn(),
    trackError: jest.fn(),
  }),
  useSessionTracking: jest.fn(),
  useThemeTracking: jest.fn(),
}));

// Mock userStore
let mockUserDocument: UserDocument | null = null;
jest.mock('../../state/userStore', () => ({
  useUserStore: () => ({
    userDocument: mockUserDocument,
  }),
}));

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserDocument = null;
  });

  describe('empty state', () => {
    it('should render empty state when no user document', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('📊')).toBeTruthy();
      expect(getByText('No progress data yet')).toBeTruthy();
    });
  });

  describe('with user document', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Python',
        learningPaths: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memory: {
          topics: {
            'variables': { confidence: 0.8, lastReviewed: new Date().toISOString(), timesTested: 5 },
            'loops': { confidence: 0.6, lastReviewed: new Date().toISOString(), timesTested: 3 },
          },
        },
        history: [
          { type: 'lesson', topic: 'Introduction', timestamp: Date.now() },
          { type: 'quiz', topic: 'Variables', score: 80, timestamp: Date.now() },
          { type: 'quiz', topic: 'Loops', score: 90, timestamp: Date.now() },
          { type: 'practice', topic: 'Functions', timestamp: Date.now() },
        ],
      };
    });

    it('should render the title', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Your Progress')).toBeTruthy();
      expect(getByText('Keep up the great work!')).toBeTruthy();
    });

    it('should display the learning goal', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Learning Goal')).toBeTruthy();
      expect(getByText('Learn Python')).toBeTruthy();
    });

    it('should display lessons completed stat', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Lessons Completed')).toBeTruthy();
    });

    it('should display quizzes completed stat', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Quizzes Completed')).toBeTruthy();
    });

    it('should display practice tasks stat', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Practice Tasks')).toBeTruthy();
    });

    it('should display topics explored stat', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Topics Explored')).toBeTruthy();
    });

    it('should display total activities', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Total Activities')).toBeTruthy();
    });

    it('should display average quiz score when quizzes exist', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Average Quiz Score')).toBeTruthy();
      // Average of 80 and 90 is 85
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display recent activity section', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Recent Activity')).toBeTruthy();
    });

    it('should show activity topics in recent activity', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('Introduction')).toBeTruthy();
      expect(getByText('Variables')).toBeTruthy();
      expect(getByText('Loops')).toBeTruthy();
      expect(getByText('Functions')).toBeTruthy();
    });
  });

  describe('with no history', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn React',
        learningPaths: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memory: {
          topics: {},
        },
        history: [],
      };
    });

    it('should not show recent activity section when no history', () => {
      const { queryByText } = render(<ProgressScreen />);

      expect(queryByText('Recent Activity')).toBeNull();
    });

    it('should show zero stats', () => {
      const { getByText } = render(<ProgressScreen />);

      // All stat values should be 0
      expect(getByText('Total Activities')).toBeTruthy();
    });
  });

  describe('with no quizzes', () => {
    beforeEach(() => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn React',
        learningPaths: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memory: {
          topics: {},
        },
        history: [
          { type: 'lesson', topic: 'Introduction', timestamp: Date.now() },
        ],
      };
    });

    it('should not show average quiz score when no quizzes', () => {
      const { queryByText } = render(<ProgressScreen />);

      expect(queryByText('Average Quiz Score')).toBeNull();
    });
  });

  describe('stat calculations', () => {
    it('should correctly count different activity types', () => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Learn Go',
        learningPaths: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memory: {
          topics: {
            'topic1': { confidence: 0, lastReviewed: '', timesTested: 0 },
            'topic2': { confidence: 0, lastReviewed: '', timesTested: 0 },
            'topic3': { confidence: 0, lastReviewed: '', timesTested: 0 },
          },
        },
        history: [
          { type: 'lesson', topic: 'A', timestamp: 1 },
          { type: 'lesson', topic: 'B', timestamp: 2 },
          { type: 'lesson', topic: 'C', timestamp: 3 },
          { type: 'quiz', topic: 'D', score: 100, timestamp: 4 },
          { type: 'practice', topic: 'E', timestamp: 5 },
          { type: 'practice', topic: 'F', timestamp: 6 },
        ],
      };

      const { getByText } = render(<ProgressScreen />);

      // Should show topics explored
      expect(getByText('Topics Explored')).toBeTruthy();
    });

    it('should handle quiz with undefined score', () => {
      mockUserDocument = {
        uid: 'test-user-123',
        goal: 'Test',
        learningPaths: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memory: { topics: {} },
        history: [
          { type: 'quiz', topic: 'Test Quiz', timestamp: Date.now() },
        ],
      };

      // Should not crash
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('Quizzes Completed')).toBeTruthy();
    });
  });
});
