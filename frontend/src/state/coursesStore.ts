import { create } from 'zustand';
import { Course, Step, CourseStatus } from '../types/app';

interface CacheMetadata {
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CoursesState {
  courses: Course[];
  activeCourse: Course | null;
  loading: boolean;
  error: string | null;
  coursesCache: Map<string, CacheMetadata>; // Cache timestamps for each course
  listCache: CacheMetadata | null; // Cache timestamp for courses list

  // Actions
  setCourses: (courses: Course[]) => void;
  setActiveCourse: (course: Course | null) => void;
  addCourse: (course: Course) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  archiveCourse: (courseId: string) => void;
  restoreCourse: (courseId: string) => void;
  addStep: (courseId: string, step: Step) => void;
  updateStep: (courseId: string, stepId: string, updates: Partial<Step>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCourses: () => void;
  // Cache helpers
  isCacheValid: (cacheMetadata: CacheMetadata | null) => boolean;
  getCachedCourse: (courseId: string) => Course | null;
  invalidateCourseCache: (courseId: string) => void;
  invalidateListCache: () => void;
  clearAllCache: () => void; // Clear all cache metadata (called on login)
  // Selectors
  getCoursesByStatus: (status: CourseStatus) => Course[];
}

// Helper to find current (incomplete) step
export const getCurrentStep = (steps: Step[]): Step | null => {
  return steps.find((s) => !s.completed) || null;
};

// Helper to get completed steps
export const getCompletedSteps = (steps: Step[]): Step[] => {
  return steps.filter((s) => s.completed);
};

// Cache configuration (5 minutes TTL)
const CACHE_TTL = 5 * 60 * 1000;

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  activeCourse: null,
  loading: false,
  error: null,
  coursesCache: new Map(),
  listCache: null,

  setCourses: (courses) => {
    // Sort by lastAccessedAt descending (most recent first)
    const sortedCourses = [...courses].sort(
      (a, b) => b.lastAccessedAt - a.lastAccessedAt
    );
    // Update cache for each course
    const coursesCache = new Map<string, CacheMetadata>();
    sortedCourses.forEach((course) => {
      coursesCache.set(course.id, { timestamp: Date.now(), ttl: CACHE_TTL });
    });
    set({
      courses: sortedCourses,
      coursesCache,
      listCache: { timestamp: Date.now(), ttl: CACHE_TTL },
    });
  },

  setActiveCourse: (course) => set({ activeCourse: course }),

  addCourse: (course) => {
    const { courses } = get();
    set({ courses: [course, ...courses] });
  },

  updateCourse: (courseId, updates) => {
    const { courses, activeCourse, coursesCache } = get();
    const updatedCourses = courses.map((c) =>
      c.id === courseId ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    // Re-sort after update
    updatedCourses.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    // Update cache timestamp for this course
    coursesCache.set(courseId, { timestamp: Date.now(), ttl: CACHE_TTL });
    set({
      courses: updatedCourses,
      activeCourse:
        activeCourse?.id === courseId
          ? { ...activeCourse, ...updates, updatedAt: Date.now() }
          : activeCourse,
      coursesCache,
    });
  },

  deleteCourse: (courseId) => {
    const { courses, activeCourse, coursesCache } = get();
    coursesCache.delete(courseId);
    set({
      courses: courses.filter((c) => c.id !== courseId),
      activeCourse: activeCourse?.id === courseId ? null : activeCourse,
      coursesCache,
    });
  },

  archiveCourse: (courseId) => {
    const { courses, activeCourse, coursesCache } = get();
    const updatedCourses = courses.map((c) =>
      c.id === courseId
        ? { ...c, status: 'archived' as CourseStatus, archivedAt: Date.now(), updatedAt: Date.now() }
        : c
    );
    coursesCache.set(courseId, { timestamp: Date.now(), ttl: CACHE_TTL });
    set({
      courses: updatedCourses,
      activeCourse:
        activeCourse?.id === courseId
          ? { ...activeCourse, status: 'archived' as CourseStatus, archivedAt: Date.now(), updatedAt: Date.now() }
          : activeCourse,
      coursesCache,
    });
  },

  restoreCourse: (courseId) => {
    const { courses, activeCourse, coursesCache } = get();
    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
        // Determine if course should be 'active' or 'completed' based on progress
        const newStatus: CourseStatus = c.progress >= 100 ? 'completed' : 'active';
        return { ...c, status: newStatus, archivedAt: undefined, updatedAt: Date.now() };
      }
      return c;
    });
    coursesCache.set(courseId, { timestamp: Date.now(), ttl: CACHE_TTL });
    set({
      courses: updatedCourses,
      activeCourse:
        activeCourse?.id === courseId
          ? {
              ...activeCourse,
              status: activeCourse.progress >= 100 ? 'completed' : 'active',
              archivedAt: undefined,
              updatedAt: Date.now(),
            }
          : activeCourse,
      coursesCache,
    });
  },

  addStep: (courseId, step) => {
    const { courses, activeCourse } = get();
    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
        return { ...c, steps: [...c.steps, step] };
      }
      return c;
    });
    set({
      courses: updatedCourses,
      activeCourse:
        activeCourse?.id === courseId
          ? { ...activeCourse, steps: [...activeCourse.steps, step] }
          : activeCourse,
    });
  },

  updateStep: (courseId, stepId, updates) => {
    const { courses, activeCourse } = get();
    const updateSteps = (steps: Step[]) =>
      steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));

    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
        return { ...c, steps: updateSteps(c.steps) };
      }
      return c;
    });

    set({
      courses: updatedCourses,
      activeCourse:
        activeCourse?.id === courseId
          ? { ...activeCourse, steps: updateSteps(activeCourse.steps) }
          : activeCourse,
    });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearCourses: () =>
    set({
      courses: [],
      activeCourse: null,
      error: null,
      coursesCache: new Map(),
      listCache: null,
    }),

  // Cache helpers
  isCacheValid: (cacheMetadata) => {
    if (!cacheMetadata) return false;
    const now = Date.now();
    return now - cacheMetadata.timestamp < cacheMetadata.ttl;
  },

  getCachedCourse: (courseId) => {
    const { courses } = get();
    return courses.find((c) => c.id === courseId) || null;
  },

  invalidateCourseCache: (courseId) => {
    const { coursesCache } = get();
    coursesCache.delete(courseId);
    set({ coursesCache });
  },

  invalidateListCache: () => {
    set({ listCache: null });
  },

  clearAllCache: () => {
    set({
      coursesCache: new Map(),
      listCache: null,
    });
  },

  getCoursesByStatus: (status) => {
    const { courses } = get();
    return courses.filter((c) => {
      const courseStatus = c.status || (c.progress >= 100 ? 'completed' : 'active');
      return courseStatus === status;
    });
  },
}));

// Helper function to generate emoji based on goal
export const getEmojiForGoal = (goal: string): string => {
  const lowerGoal = goal.toLowerCase();

  // Programming languages
  if (lowerGoal.includes('python')) return '🐍';
  if (lowerGoal.includes('javascript') || lowerGoal.includes('js')) return '💛';
  if (lowerGoal.includes('typescript') || lowerGoal.includes('ts')) return '💙';
  if (lowerGoal.includes('java') && !lowerGoal.includes('javascript')) return '☕';
  if (lowerGoal.includes('rust')) return '🦀';
  if (lowerGoal.includes('go') || lowerGoal.includes('golang')) return '🐹';
  if (lowerGoal.includes('swift')) return '🍎';
  if (lowerGoal.includes('kotlin')) return '🟣';
  if (lowerGoal.includes('c++') || lowerGoal.includes('cpp')) return '⚡';
  if (lowerGoal.includes('ruby')) return '💎';
  if (lowerGoal.includes('php')) return '🐘';

  // Web development
  if (lowerGoal.includes('react')) return '⚛️';
  if (lowerGoal.includes('web') || lowerGoal.includes('html') || lowerGoal.includes('css')) return '🌐';
  if (lowerGoal.includes('node')) return '🟢';

  // Data & AI
  if (lowerGoal.includes('machine learning') || lowerGoal.includes('ml')) return '🤖';
  if (lowerGoal.includes('data science') || lowerGoal.includes('data analysis')) return '📊';
  if (lowerGoal.includes('ai') || lowerGoal.includes('artificial intelligence')) return '🧠';

  // Other tech
  if (lowerGoal.includes('database') || lowerGoal.includes('sql')) return '🗄️';
  if (lowerGoal.includes('cloud') || lowerGoal.includes('aws') || lowerGoal.includes('azure')) return '☁️';
  if (lowerGoal.includes('devops') || lowerGoal.includes('docker') || lowerGoal.includes('kubernetes')) return '🐳';
  if (lowerGoal.includes('security') || lowerGoal.includes('cyber')) return '🔒';
  if (lowerGoal.includes('mobile') || lowerGoal.includes('app')) return '📱';

  // Languages
  if (lowerGoal.includes('spanish')) return '🇪🇸';
  if (lowerGoal.includes('french')) return '🇫🇷';
  if (lowerGoal.includes('german')) return '🇩🇪';
  if (lowerGoal.includes('japanese')) return '🇯🇵';
  if (lowerGoal.includes('chinese') || lowerGoal.includes('mandarin')) return '🇨🇳';
  if (lowerGoal.includes('korean')) return '🇰🇷';
  if (lowerGoal.includes('language')) return '🗣️';

  // Skills
  if (lowerGoal.includes('cook') || lowerGoal.includes('culinary') || lowerGoal.includes('recipe')) return '🍳';
  if (lowerGoal.includes('music') || lowerGoal.includes('piano') || lowerGoal.includes('instrument')) return '🎵';
  if (lowerGoal.includes('guitar')) return '🎸';
  if (lowerGoal.includes('draw') || lowerGoal.includes('art') || lowerGoal.includes('paint')) return '🎨';
  if (lowerGoal.includes('photo')) return '📷';
  if (lowerGoal.includes('write') || lowerGoal.includes('writing')) return '✍️';
  if (lowerGoal.includes('design')) return '🎨';
  if (lowerGoal.includes('math')) return '🔢';
  if (lowerGoal.includes('physics')) return '⚛️';
  if (lowerGoal.includes('chemistry')) return '🧪';
  if (lowerGoal.includes('biology')) return '🧬';
  if (lowerGoal.includes('history')) return '📜';
  if (lowerGoal.includes('business') || lowerGoal.includes('entrepreneur')) return '💼';
  if (lowerGoal.includes('finance') || lowerGoal.includes('invest')) return '💰';
  if (lowerGoal.includes('fitness') || lowerGoal.includes('exercise') || lowerGoal.includes('workout')) return '💪';
  if (lowerGoal.includes('yoga') || lowerGoal.includes('meditation')) return '🧘';

  // Default
  return '📚';
};

// Helper to generate unique ID
export const generateCourseId = (): string => {
  return `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
