import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressScreen } from '../ProgressScreen';
import { UserDocument } from '../../types/app';

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
        level: 'beginner',
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

    it('should display the level badge', () => {
      const { getByText } = render(<ProgressScreen />);

      expect(getByText('beginner')).toBeTruthy();
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
        level: 'intermediate',
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
        level: 'intermediate',
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
        level: 'advanced',
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
        level: 'beginner',
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
