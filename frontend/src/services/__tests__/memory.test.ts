import {
  getUserDocument,
  createUserDocument,
  updateUserGoalAndLevel,
  updateUserHistory,
  updateNextStep,
  clearNextStep,
  updateTopicMemory,
} from '../memory';

// Mock the userApi
jest.mock('../api', () => ({
  userApi: {
    getUserDocument: jest.fn(),
    createUserDocument: jest.fn(),
    updateGoalAndLevel: jest.fn(),
    addHistory: jest.fn(),
    setNextStep: jest.fn(),
    clearNextStep: jest.fn(),
    updateMemory: jest.fn(),
  },
}));

import { userApi } from '../api';

describe('Memory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserDocument', () => {
    it('should call userApi.getUserDocument', async () => {
      const mockDocument = {
        uid: 'user123',
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (userApi.getUserDocument as jest.Mock).mockResolvedValue(mockDocument);

      const result = await getUserDocument();

      expect(userApi.getUserDocument).toHaveBeenCalled();
      expect(result).toEqual(mockDocument);
    });

    it('should return null when no document', async () => {
      (userApi.getUserDocument as jest.Mock).mockResolvedValue(null);

      const result = await getUserDocument();

      expect(result).toBeNull();
    });
  });

  describe('createUserDocument', () => {
    it('should call userApi.createUserDocument with goal', async () => {
      (userApi.createUserDocument as jest.Mock).mockResolvedValue(undefined);

      await createUserDocument('Learn Python');

      expect(userApi.createUserDocument).toHaveBeenCalledWith('Learn Python');
    });
  });

  describe('updateUserGoalAndLevel', () => {
    it('should call userApi.updateGoalAndLevel', async () => {
      (userApi.updateGoalAndLevel as jest.Mock).mockResolvedValue(undefined);

      await updateUserGoalAndLevel('Learn JavaScript', 'intermediate');

      expect(userApi.updateGoalAndLevel).toHaveBeenCalledWith(
        'Learn JavaScript',
        'intermediate'
      );
    });
  });

  describe('updateUserHistory', () => {
    it('should call userApi.addHistory with correct parameters', async () => {
      (userApi.addHistory as jest.Mock).mockResolvedValue(undefined);

      const historyEntry = {
        type: 'lesson' as const,
        topic: 'Python Basics',
        score: 0.85,
        timestamp: Date.now(),
      };

      await updateUserHistory(historyEntry);

      expect(userApi.addHistory).toHaveBeenCalledWith({
        type: 'lesson',
        topic: 'Python Basics',
        score: 0.85,
      });
    });

    it('should handle history entry without score', async () => {
      (userApi.addHistory as jest.Mock).mockResolvedValue(undefined);

      const historyEntry = {
        type: 'lesson' as const,
        topic: 'Test',
        timestamp: Date.now(),
      };

      await updateUserHistory(historyEntry);

      expect(userApi.addHistory).toHaveBeenCalledWith({
        type: 'lesson',
        topic: 'Test',
        score: undefined,
      });
    });
  });

  describe('updateNextStep', () => {
    it('should call userApi.setNextStep with mapped parameters', async () => {
      (userApi.setNextStep as jest.Mock).mockResolvedValue(undefined);

      const nextStep = {
        type: 'lesson' as const,
        topic: 'Python Variables',
        title: 'Learn Variables',
        content: 'Variables are...',
        question: undefined,
        expectedAnswer: undefined,
        task: undefined,
      };

      await updateNextStep(nextStep);

      expect(userApi.setNextStep).toHaveBeenCalledWith({
        type: 'lesson',
        topic: 'Python Variables',
        title: 'Learn Variables',
        content: 'Variables are...',
        question: undefined,
        answer: undefined,
        task: undefined,
      });
    });

    it('should map expectedAnswer to answer', async () => {
      (userApi.setNextStep as jest.Mock).mockResolvedValue(undefined);

      const nextStep = {
        type: 'quiz' as const,
        topic: 'Python Quiz',
        question: 'What is 2+2?',
        expectedAnswer: '4',
      };

      await updateNextStep(nextStep);

      expect(userApi.setNextStep).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: '4',
        })
      );
    });
  });

  describe('clearNextStep', () => {
    it('should call userApi.clearNextStep', async () => {
      (userApi.clearNextStep as jest.Mock).mockResolvedValue(undefined);

      await clearNextStep();

      expect(userApi.clearNextStep).toHaveBeenCalled();
    });
  });

  describe('updateTopicMemory', () => {
    it('should call userApi.updateMemory with correct parameters', async () => {
      (userApi.updateMemory as jest.Mock).mockResolvedValue(undefined);

      await updateTopicMemory('Python Basics', 0.85, 5);

      expect(userApi.updateMemory).toHaveBeenCalledWith({
        topic: 'Python Basics',
        confidence: 0.85,
        timesTested: 5,
      });
    });

    it('should handle zero values', async () => {
      (userApi.updateMemory as jest.Mock).mockResolvedValue(undefined);

      await updateTopicMemory('New Topic', 0, 0);

      expect(userApi.updateMemory).toHaveBeenCalledWith({
        topic: 'New Topic',
        confidence: 0,
        timesTested: 0,
      });
    });
  });
});
