import {
  getUserDocument,
  createUserDocument,
  updateUserGoal,
  updateUserHistory,
} from '../memory';

// Mock the userApi
jest.mock('../api', () => ({
  userApi: {
    getUserDocument: jest.fn(),
    createUserDocument: jest.fn(),
    updateGoal: jest.fn(),
    addHistory: jest.fn(),
  },
  coursesApi: {
    createCourse: jest.fn(),
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

  describe('updateUserGoal', () => {
    it('should call userApi.updateGoal', async () => {
      (userApi.updateGoal as jest.Mock).mockResolvedValue(undefined);

      await updateUserGoal('Learn JavaScript');

      expect(userApi.updateGoal).toHaveBeenCalledWith('Learn JavaScript');
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
});
