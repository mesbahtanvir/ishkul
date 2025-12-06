import { act } from '@testing-library/react-native';
import {
  useCoursesStore,
  getCurrentStep,
  getCompletedSteps,
  getEmojiForGoal,
  generateCourseId,
} from '../coursesStore';
import { Course, Step } from '../../types/app';

// Helper to create mock learning path
const createMockPath = (overrides: Partial<Course> = {}): Course => ({
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

describe('coursesStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useCoursesStore.setState({
        courses: [],
        activeCourse: null,
        loading: false,
        error: null,
        coursesCache: new Map(),
        listCache: null,
      });
    });
  });

  describe('initial state', () => {
    it('should have empty courses array', () => {
      const state = useCoursesStore.getState();
      expect(state.courses).toEqual([]);
    });

    it('should have null activeCourse', () => {
      const state = useCoursesStore.getState();
      expect(state.activeCourse).toBeNull();
    });

    it('should not be loading', () => {
      const state = useCoursesStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should have no error', () => {
      const state = useCoursesStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setCourses', () => {
    it('should set courses and sort by lastAccessedAt', () => {
      const older = createMockPath({ id: 'older', lastAccessedAt: 1000 });
      const newer = createMockPath({ id: 'newer', lastAccessedAt: 2000 });

      act(() => {
        useCoursesStore.getState().setCourses([older, newer]);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe('newer'); // Most recent first
      expect(courses[1].id).toBe('older');
    });

    it('should update list cache', () => {
      act(() => {
        useCoursesStore.getState().setCourses([createMockPath()]);
      });

      const { listCache } = useCoursesStore.getState();
      expect(listCache).not.toBeNull();
      expect(listCache?.timestamp).toBeDefined();
    });
  });

  describe('setActiveCourse', () => {
    it('should set active path', () => {
      const path = createMockPath();

      act(() => {
        useCoursesStore.getState().setActiveCourse(path);
      });

      expect(useCoursesStore.getState().activeCourse).toEqual(path);
    });

    it('should clear active path when set to null', () => {
      const path = createMockPath();

      act(() => {
        useCoursesStore.getState().setActiveCourse(path);
        useCoursesStore.getState().setActiveCourse(null);
      });

      expect(useCoursesStore.getState().activeCourse).toBeNull();
    });
  });

  describe('addCourse', () => {
    it('should add path to beginning of list', () => {
      const existing = createMockPath({ id: 'existing' });
      const newPath = createMockPath({ id: 'new' });

      act(() => {
        useCoursesStore.getState().setCourses([existing]);
        useCoursesStore.getState().addCourse(newPath);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe('new');
    });
  });

  describe('updateCourse', () => {
    it('should update path in list', () => {
      const path = createMockPath({ id: 'path-1', goal: 'Original' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().updateCourse('path-1', { goal: 'Updated' });
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].goal).toBe('Updated');
    });

    it('should update activeCourse if it matches', () => {
      const path = createMockPath({ id: 'path-1', goal: 'Original' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().setActiveCourse(path);
        useCoursesStore.getState().updateCourse('path-1', { goal: 'Updated' });
      });

      expect(useCoursesStore.getState().activeCourse?.goal).toBe('Updated');
    });

    it('should not update activeCourse if it does not match', () => {
      const path1 = createMockPath({ id: 'path-1', goal: 'Path 1' });
      const path2 = createMockPath({ id: 'path-2', goal: 'Path 2' });

      act(() => {
        useCoursesStore.getState().setCourses([path1, path2]);
        useCoursesStore.getState().setActiveCourse(path1);
        useCoursesStore.getState().updateCourse('path-2', { goal: 'Updated' });
      });

      expect(useCoursesStore.getState().activeCourse?.goal).toBe('Path 1');
    });
  });

  describe('deleteCourse', () => {
    it('should remove path from list', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().deleteCourse('path-1');
      });

      expect(useCoursesStore.getState().courses).toHaveLength(0);
    });

    it('should clear activeCourse if it was deleted', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().setActiveCourse(path);
        useCoursesStore.getState().deleteCourse('path-1');
      });

      expect(useCoursesStore.getState().activeCourse).toBeNull();
    });
  });

  describe('addStep', () => {
    it('should add step to path', () => {
      const path = createMockPath({ id: 'path-1', steps: [] });
      const step = createMockStep();

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().addStep('path-1', step);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].steps).toHaveLength(1);
      expect(courses[0].steps[0].id).toBe(step.id);
    });

    it('should update activeCourse steps if it matches', () => {
      const path = createMockPath({ id: 'path-1', steps: [] });
      const step = createMockStep();

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().setActiveCourse(path);
        useCoursesStore.getState().addStep('path-1', step);
      });

      expect(useCoursesStore.getState().activeCourse?.steps).toHaveLength(1);
    });
  });

  describe('updateStep', () => {
    it('should update step in path', () => {
      const step = createMockStep({ id: 'step-1', completed: false });
      const path = createMockPath({ id: 'path-1', steps: [step] });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().updateStep('path-1', 'step-1', { completed: true });
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].steps[0].completed).toBe(true);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      act(() => {
        useCoursesStore.getState().setLoading(true);
      });

      expect(useCoursesStore.getState().loading).toBe(true);
    });
  });

  describe('error state', () => {
    it('should set error message', () => {
      act(() => {
        useCoursesStore.getState().setError('Something went wrong');
      });

      expect(useCoursesStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      act(() => {
        useCoursesStore.getState().setError('Error');
        useCoursesStore.getState().setError(null);
      });

      expect(useCoursesStore.getState().error).toBeNull();
    });
  });

  describe('clearCourses', () => {
    it('should clear all courses and reset state', () => {
      const path = createMockPath();

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().setActiveCourse(path);
        useCoursesStore.getState().setError('Error');
        useCoursesStore.getState().clearCourses();
      });

      const state = useCoursesStore.getState();
      expect(state.courses).toHaveLength(0);
      expect(state.activeCourse).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('cache helpers', () => {
    it('should validate cache correctly', () => {
      const { isCacheValid } = useCoursesStore.getState();

      expect(isCacheValid(null)).toBe(false);
      expect(isCacheValid({ timestamp: Date.now(), ttl: 5 * 60 * 1000 })).toBe(true);
      expect(isCacheValid({ timestamp: Date.now() - 10 * 60 * 1000, ttl: 5 * 60 * 1000 })).toBe(false);
    });

    it('should get cached path', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
      });

      const cached = useCoursesStore.getState().getCachedCourse('path-1');
      expect(cached?.id).toBe('path-1');
    });

    it('should return null for non-existent cached path', () => {
      const cached = useCoursesStore.getState().getCachedCourse('non-existent');
      expect(cached).toBeNull();
    });

    it('should invalidate path cache', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().invalidateCourseCache('path-1');
      });

      const { coursesCache } = useCoursesStore.getState();
      expect(coursesCache.has('path-1')).toBe(false);
    });

    it('should invalidate list cache', () => {
      const path = createMockPath();

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().invalidateListCache();
      });

      expect(useCoursesStore.getState().listCache).toBeNull();
    });

    it('should clear all cache', () => {
      const path = createMockPath({ id: 'path-1' });

      act(() => {
        useCoursesStore.getState().setCourses([path]);
        useCoursesStore.getState().clearAllCache();
      });

      const state = useCoursesStore.getState();
      expect(state.coursesCache.size).toBe(0);
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

  describe('generateCourseId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCourseId());
      }
      expect(ids.size).toBe(100); // All unique
    });

    it('should start with course_ prefix', () => {
      const id = generateCourseId();
      expect(id.startsWith('course_')).toBe(true);
    });
  });
});
