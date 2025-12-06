import { act } from '@testing-library/react-native';
import {
  useLearningPathsStore,
  getCurrentStep,
  getCompletedSteps,
  getEmojiForGoal,
  generatePathId,
} from '../learningPathsStore';
import { LearningPath, Step } from '../../types/app';

// Helper to create mock learning path
const createMockPath = (overrides: Partial<LearningPath> = {}): LearningPath => ({
  id: `path_${Date.now()}`,
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
});

// Helper to create mock step
const createMockStep = (overrides: Partial<Step> = {}): Step => ({
  id: `step_${Date.now()}`,
  index: 0,
  type: 'lesson',
  topic: 'Introduction',
  title: 'Getting Started',
  content: 'Welcome to the course',
  completed: false,
  createdAt: Date.now(),
  ...overrides,
});

describe('learningPathsStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useLearningPathsStore.setState({
        paths: [],
        activePath: null,
        loading: false,
        error: null,
        pathsCache: new Map(),
        listCache: null,
      });
    });
  });

  describe('initial state', () => {
    it('should have empty paths array', () => {
      const state = useLearningPathsStore.getState();
      expect(state.paths).toEqual([]);
    });

    it('should have null activePath', () => {
      const state = useLearningPathsStore.getState();
      expect(state.activePath).toBeNull();
    });

    it('should not be loading', () => {
      const state = useLearningPathsStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should have no error', () => {
      const state = useLearningPathsStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setPaths', () => {
    it('should set paths and sort by lastAccessedAt', () => {
      const older = createMockPath({ id: 'older', lastAccessedAt: 1000 });
      const newer = createMockPath({ id: 'newer', lastAccessedAt: 2000 });

      act(() => {
        useLearningPathsStore.getState().setPaths([older, newer]);
      });

      const { paths } = useLearningPathsStore.getState();
      expect(paths).toHaveLength(2);
      expect(paths[0].id).toBe('newer'); // Most recent first
      expect(paths[1].id).toBe('older');
    });

    it('should update list cache', () => {
      act(() => {
        useLearningPathsStore.getState().setPaths([createMockPath()]);
      });

      const { listCache } = useLearningPathsStore.getState();
      expect(listCache).not.toBeNull();
      expect(listCache?.timestamp).toBeDefined();
    });
  });

  describe('setActivePath', () => {
    it('should set active path', () => {
      const path = createMockPath();

      act(() => {
        useLearningPathsStore.getState().setActivePath(path);
      });

      expect(useLearningPathsStore.getState().activePath).toEqual(path);
    });

    it('should clear active path when set to null', () => {
      const path = createMockPath();

      act(() => {
        useLearningPathsStore.getState().setActivePath(path);
        useLearningPathsStore.getState().setActivePath(null);
      });

      expect(useLearningPathsStore.getState().activePath).toBeNull();
    });
  });

  describe('addPath', () => {
    it('should add path to beginning of list', () => {
      const existing = createMockPath({ id: 'existing' });
      const newPath = createMockPath({ id: 'new' });

      act(() => {
        useLearningPathsStore.getState().setPaths([existing]);
        useLearningPathsStore.getState().addPath(newPath);
      });

      const { paths } = useLearningPathsStore.getState();
      expect(paths).toHaveLength(2);
      expect(paths[0].id).toBe('new');
    });
  });

  describe('updatePath', () => {
    it('should update path in list', () => {
      const path = createMockPath({ id: 'path-1', goal: 'Original' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().updatePath('path-1', { goal: 'Updated' });
      });

      const { paths } = useLearningPathsStore.getState();
      expect(paths[0].goal).toBe('Updated');
    });

    it('should update activePath if it matches', () => {
      const path = createMockPath({ id: 'path-1', goal: 'Original' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().setActivePath(path);
        useLearningPathsStore.getState().updatePath('path-1', { goal: 'Updated' });
      });

      expect(useLearningPathsStore.getState().activePath?.goal).toBe('Updated');
    });

    it('should not update activePath if it does not match', () => {
      const path1 = createMockPath({ id: 'path-1', goal: 'Path 1' });
      const path2 = createMockPath({ id: 'path-2', goal: 'Path 2' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path1, path2]);
        useLearningPathsStore.getState().setActivePath(path1);
        useLearningPathsStore.getState().updatePath('path-2', { goal: 'Updated' });
      });

      expect(useLearningPathsStore.getState().activePath?.goal).toBe('Path 1');
    });
  });

  describe('deletePath', () => {
    it('should remove path from list', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().deletePath('path-1');
      });

      expect(useLearningPathsStore.getState().paths).toHaveLength(0);
    });

    it('should clear activePath if it was deleted', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().setActivePath(path);
        useLearningPathsStore.getState().deletePath('path-1');
      });

      expect(useLearningPathsStore.getState().activePath).toBeNull();
    });
  });

  describe('addStep', () => {
    it('should add step to path', () => {
      const path = createMockPath({ id: 'path-1', steps: [] });
      const step = createMockStep();

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().addStep('path-1', step);
      });

      const { paths } = useLearningPathsStore.getState();
      expect(paths[0].steps).toHaveLength(1);
      expect(paths[0].steps[0].id).toBe(step.id);
    });

    it('should update activePath steps if it matches', () => {
      const path = createMockPath({ id: 'path-1', steps: [] });
      const step = createMockStep();

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().setActivePath(path);
        useLearningPathsStore.getState().addStep('path-1', step);
      });

      expect(useLearningPathsStore.getState().activePath?.steps).toHaveLength(1);
    });
  });

  describe('updateStep', () => {
    it('should update step in path', () => {
      const step = createMockStep({ id: 'step-1', completed: false });
      const path = createMockPath({ id: 'path-1', steps: [step] });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().updateStep('path-1', 'step-1', { completed: true });
      });

      const { paths } = useLearningPathsStore.getState();
      expect(paths[0].steps[0].completed).toBe(true);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      act(() => {
        useLearningPathsStore.getState().setLoading(true);
      });

      expect(useLearningPathsStore.getState().loading).toBe(true);
    });
  });

  describe('error state', () => {
    it('should set error message', () => {
      act(() => {
        useLearningPathsStore.getState().setError('Something went wrong');
      });

      expect(useLearningPathsStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      act(() => {
        useLearningPathsStore.getState().setError('Error');
        useLearningPathsStore.getState().setError(null);
      });

      expect(useLearningPathsStore.getState().error).toBeNull();
    });
  });

  describe('clearPaths', () => {
    it('should clear all paths and reset state', () => {
      const path = createMockPath();

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().setActivePath(path);
        useLearningPathsStore.getState().setError('Error');
        useLearningPathsStore.getState().clearPaths();
      });

      const state = useLearningPathsStore.getState();
      expect(state.paths).toHaveLength(0);
      expect(state.activePath).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('cache helpers', () => {
    it('should validate cache correctly', () => {
      const { isCacheValid } = useLearningPathsStore.getState();

      expect(isCacheValid(null)).toBe(false);
      expect(isCacheValid({ timestamp: Date.now(), ttl: 5 * 60 * 1000 })).toBe(true);
      expect(isCacheValid({ timestamp: Date.now() - 10 * 60 * 1000, ttl: 5 * 60 * 1000 })).toBe(false);
    });

    it('should get cached path', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
      });

      const cached = useLearningPathsStore.getState().getCachedPath('path-1');
      expect(cached?.id).toBe('path-1');
    });

    it('should return null for non-existent cached path', () => {
      const cached = useLearningPathsStore.getState().getCachedPath('non-existent');
      expect(cached).toBeNull();
    });

    it('should invalidate path cache', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().invalidatePathCache('path-1');
      });

      const { pathsCache } = useLearningPathsStore.getState();
      expect(pathsCache.has('path-1')).toBe(false);
    });

    it('should invalidate list cache', () => {
      const path = createMockPath();

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().invalidateListCache();
      });

      expect(useLearningPathsStore.getState().listCache).toBeNull();
    });

    it('should clear all cache', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useLearningPathsStore.getState().setPaths([path]);
        useLearningPathsStore.getState().clearAllCache();
      });

      const state = useLearningPathsStore.getState();
      expect(state.pathsCache.size).toBe(0);
      expect(state.listCache).toBeNull();
    });
  });
});

describe('helper functions', () => {
  describe('getCurrentStep', () => {
    it('should return first incomplete step', () => {
      const steps: Step[] = [
        createMockStep({ id: '1', completed: true }),
        createMockStep({ id: '2', completed: false }),
        createMockStep({ id: '3', completed: false }),
      ];

      const current = getCurrentStep(steps);
      expect(current?.id).toBe('2');
    });

    it('should return null when all steps completed', () => {
      const steps: Step[] = [
        createMockStep({ completed: true }),
        createMockStep({ completed: true }),
      ];

      expect(getCurrentStep(steps)).toBeNull();
    });

    it('should return null for empty steps', () => {
      expect(getCurrentStep([])).toBeNull();
    });
  });

  describe('getCompletedSteps', () => {
    it('should return only completed steps', () => {
      const steps: Step[] = [
        createMockStep({ id: '1', completed: true }),
        createMockStep({ id: '2', completed: false }),
        createMockStep({ id: '3', completed: true }),
      ];

      const completed = getCompletedSteps(steps);
      expect(completed).toHaveLength(2);
      expect(completed.map((s) => s.id)).toEqual(['1', '3']);
    });

    it('should return empty array when no completed steps', () => {
      const steps: Step[] = [
        createMockStep({ completed: false }),
      ];

      expect(getCompletedSteps(steps)).toHaveLength(0);
    });
  });

  describe('getEmojiForGoal', () => {
    it('should return Python emoji for Python goals', () => {
      expect(getEmojiForGoal('Learn Python')).toBe('🐍');
      expect(getEmojiForGoal('python programming')).toBe('🐍');
    });

    it('should return JavaScript emoji for JS goals', () => {
      expect(getEmojiForGoal('Learn JavaScript')).toBe('💛');
      expect(getEmojiForGoal('js basics')).toBe('💛');
    });

    it('should return TypeScript emoji for TS goals', () => {
      expect(getEmojiForGoal('Learn TypeScript')).toBe('💙');
      expect(getEmojiForGoal('ts advanced')).toBe('💙');
    });

    it('should return Go emoji for Go goals', () => {
      expect(getEmojiForGoal('Learn Go')).toBe('🐹');
      expect(getEmojiForGoal('golang basics')).toBe('🐹');
    });

    it('should return Java emoji (not JavaScript)', () => {
      expect(getEmojiForGoal('Learn Java')).toBe('☕');
    });

    it('should return web emoji for web development', () => {
      expect(getEmojiForGoal('Web Development')).toBe('🌐');
      expect(getEmojiForGoal('HTML CSS')).toBe('🌐');
    });

    it('should return React emoji for React', () => {
      expect(getEmojiForGoal('Learn React')).toBe('⚛️');
    });

    it('should return AI emoji for machine learning', () => {
      expect(getEmojiForGoal('Machine Learning')).toBe('🤖');
      expect(getEmojiForGoal('ML basics')).toBe('🤖');
    });

    it('should return default emoji for unknown goals', () => {
      expect(getEmojiForGoal('Something random')).toBe('📚');
    });

    it('should handle language learning goals', () => {
      expect(getEmojiForGoal('Learn Spanish')).toBe('🇪🇸');
      expect(getEmojiForGoal('French lessons')).toBe('🇫🇷');
      expect(getEmojiForGoal('Japanese language')).toBe('🇯🇵');
    });

    it('should handle skill-based goals', () => {
      expect(getEmojiForGoal('Learn to cook')).toBe('🍳');
      expect(getEmojiForGoal('Music lessons')).toBe('🎵');
      expect(getEmojiForGoal('Drawing basics')).toBe('🎨');
    });
  });

  describe('generatePathId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePathId());
      }
      expect(ids.size).toBe(100); // All unique
    });

    it('should start with path_ prefix', () => {
      const id = generatePathId();
      expect(id.startsWith('path_')).toBe(true);
    });
  });
});
