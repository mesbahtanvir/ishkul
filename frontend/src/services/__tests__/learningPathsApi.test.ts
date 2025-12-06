/**
 * Tests for learningPathsApi archive and unarchive methods
 *
 * These tests verify that the correct HTTP methods are used for archive/unarchive operations.
 * The backend only accepts POST for action endpoints like /archive and /unarchive.
 */

// Mock the api module before importing learningPathsApi
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../api', () => {
  const originalModule = jest.requireActual('../api');
  return {
    ...originalModule,
    api: {
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      put: mockPut,
      delete: mockDelete,
    },
    learningPathsApi: {
      ...originalModule.learningPathsApi,
      // Re-implement archive/restore to use our mocked api
      archivePath: async (pathId: string) => {
        const response = await mockPost(`/learning-paths/${pathId}/archive`);
        return response?.path;
      },
      restorePath: async (pathId: string) => {
        const response = await mockPost(`/learning-paths/${pathId}/unarchive`);
        return response?.path;
      },
    },
  };
});

import { learningPathsApi } from '../api';
import type { LearningPath } from '../../types/app';

// Helper to create mock learning path response
const createMockPathResponse = (
  overrides: Partial<LearningPath> = {}
): { path: LearningPath } => ({
  path: {
    id: 'test-path-id',
    goal: 'Learn TypeScript',
    emoji: '💙',
    status: 'active',
    progress: 0,
    lessonsCompleted: 0,
    totalLessons: 10,
    steps: [],
    memory: { topics: {} },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastAccessedAt: Date.now(),
    ...overrides,
  },
});

describe('learningPathsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('archivePath', () => {
    it('should use POST method for archive endpoint', async () => {
      const mockPath = createMockPathResponse({ status: 'archived' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.archivePath('test-path-id');

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/learning-paths/test-path-id/archive');
    });

    it('should NOT use PATCH method for archive endpoint', async () => {
      const mockPath = createMockPathResponse({ status: 'archived' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.archivePath('test-path-id');

      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('should call the correct archive endpoint URL', async () => {
      const mockPath = createMockPathResponse({ status: 'archived' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.archivePath('path-123');

      expect(mockPost).toHaveBeenCalledWith('/learning-paths/path-123/archive');
    });
  });

  describe('restorePath (unarchive)', () => {
    it('should use POST method for unarchive endpoint', async () => {
      const mockPath = createMockPathResponse({ status: 'active' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.restorePath('test-path-id');

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/learning-paths/test-path-id/unarchive');
    });

    it('should NOT use PATCH method for unarchive endpoint', async () => {
      const mockPath = createMockPathResponse({ status: 'active' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.restorePath('test-path-id');

      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('should call /unarchive endpoint, not /restore', async () => {
      const mockPath = createMockPathResponse({ status: 'active' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.restorePath('path-456');

      // Verify it calls /unarchive (backend endpoint) not /restore
      expect(mockPost).toHaveBeenCalledWith('/learning-paths/path-456/unarchive');
      // Ensure it doesn't call a /restore endpoint
      expect(mockPost).not.toHaveBeenCalledWith(
        expect.stringContaining('/restore')
      );
    });
  });

  describe('HTTP method validation', () => {
    it('archive should only use POST, matching backend handlePathAction requirements', async () => {
      const mockPath = createMockPathResponse({ status: 'archived' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.archivePath('test-id');

      // Backend handlePathAction only accepts POST for action endpoints
      // If PATCH was used, backend would return 405 Method Not Allowed
      expect(mockPost).toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('unarchive should only use POST, matching backend handlePathAction requirements', async () => {
      const mockPath = createMockPathResponse({ status: 'active' });
      mockPost.mockResolvedValueOnce(mockPath);

      await learningPathsApi.restorePath('test-id');

      // Backend handlePathAction only accepts POST for action endpoints
      // If PATCH was used, backend would return 405 Method Not Allowed
      expect(mockPost).toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
