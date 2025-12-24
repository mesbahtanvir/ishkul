/**
 * Tests for coursesStore
 *
 * Tests the course management store with the new section/lesson model
 */

import { act } from '@testing-library/react-native';
import { useCoursesStore } from '../coursesStore';
import { Course, CourseOutline, LessonStatus } from '../../types/app';

// Helper to create a mock course
const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: `course-${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user-123',
  title: 'Test Course',
  emoji: '📚',
  status: 'active',
  progress: 0,
  lessonsCompleted: 0,
  totalLessons: 5,
  lastAccessedAt: Date.now(),
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  ...overrides,
});

// Helper to create a mock outline with sections and lessons
const createMockOutline = (): CourseOutline => ({
  title: 'Test Outline',
  description: 'Test description',
  emoji: '📚',
  estimatedMinutes: 60,
  difficulty: 'beginner',
  category: 'test',
  prerequisites: [],
  learningOutcomes: ['Learn something'],
  generatedAt: Date.now(),
  sections: [
    {
      id: 'section-1',
      title: 'Introduction',
      description: 'Getting started',
      estimatedMinutes: 30,
      learningOutcomes: ['Learn basics'],
      status: 'in_progress',
      lessons: [
        {
          id: 'lesson-1-1',
          title: 'Welcome',
          description: 'Welcome to the course',
          estimatedMinutes: 15,
          status: 'completed' as LessonStatus,
          blocksStatus: 'ready',
        },
        {
          id: 'lesson-1-2',
          title: 'Overview',
          description: 'Course overview',
          estimatedMinutes: 15,
          status: 'in_progress' as LessonStatus,
          blocksStatus: 'ready',
        },
      ],
    },
    {
      id: 'section-2',
      title: 'Basics',
      description: 'Core concepts',
      estimatedMinutes: 30,
      learningOutcomes: ['Learn more'],
      status: 'pending',
      lessons: [
        {
          id: 'lesson-2-1',
          title: 'First Steps',
          description: 'Your first steps',
          estimatedMinutes: 30,
          status: 'pending' as LessonStatus,
          blocksStatus: 'pending',
        },
      ],
    },
  ],
});

describe('coursesStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useCoursesStore.getState().clearCourses();
    });
  });

  describe('basic course operations', () => {
    it('should start with empty courses', () => {
      const { courses } = useCoursesStore.getState();
      expect(courses).toEqual([]);
    });

    it('should set courses and sort by lastAccessedAt', () => {
      const oldCourse = createMockCourse({ id: 'old', lastAccessedAt: 1000 });
      const newCourse = createMockCourse({ id: 'new', lastAccessedAt: 2000 });

      act(() => {
        useCoursesStore.getState().setCourses([oldCourse, newCourse]);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe('new'); // Most recent first
      expect(courses[1].id).toBe('old');
    });

    it('should add a course to the beginning', () => {
      const existingCourse = createMockCourse({ id: 'existing' });
      const newCourse = createMockCourse({ id: 'new' });

      act(() => {
        useCoursesStore.getState().setCourses([existingCourse]);
        useCoursesStore.getState().addCourse(newCourse);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe('new');
    });

    it('should update a course', () => {
      const course = createMockCourse({ id: 'test', title: 'Original' });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().updateCourse('test', { title: 'Updated' });
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].title).toBe('Updated');
    });

    it('should delete a course', () => {
      const course1 = createMockCourse({ id: 'keep' });
      const course2 = createMockCourse({ id: 'delete' });

      act(() => {
        useCoursesStore.getState().setCourses([course1, course2]);
        useCoursesStore.getState().deleteCourse('delete');
      });

      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe('keep');
    });

    it('should set active course', () => {
      const course = createMockCourse();

      act(() => {
        useCoursesStore.getState().setActiveCourse(course);
      });

      const { activeCourse } = useCoursesStore.getState();
      expect(activeCourse).toEqual(course);
    });
  });

  describe('archive/restore operations', () => {
    it('should archive a course', () => {
      const course = createMockCourse({ id: 'test', status: 'active' });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().archiveCourse('test');
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].status).toBe('archived');
      expect(courses[0].archivedAt).toBeDefined();
    });

    it('should restore an archived course to active', () => {
      const course = createMockCourse({
        id: 'test',
        status: 'archived',
        progress: 50,
      });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().restoreCourse('test');
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].status).toBe('active');
      expect(courses[0].archivedAt).toBeUndefined();
    });

    it('should restore a completed course to completed status', () => {
      const course = createMockCourse({
        id: 'test',
        status: 'archived',
        progress: 100,
      });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().restoreCourse('test');
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].status).toBe('completed');
    });
  });

  describe('outline and lesson operations', () => {
    it('should set course outline', () => {
      const course = createMockCourse({ id: 'test' });
      const outline = createMockOutline();

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().setCourseOutline('test', outline);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].outline).toEqual(outline);
    });

    it('should update a lesson within a section', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().updateLesson('test', 'section-1', 'lesson-1-1', {
          title: 'Updated Title',
        });
      });

      const { courses } = useCoursesStore.getState();
      const lesson = courses[0].outline?.sections[0].lessons[0];
      expect(lesson?.title).toBe('Updated Title');
    });

    it('should update lesson status', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().updateLessonStatus('test', 'section-1', 'lesson-1-2', 'completed');
      });

      const { courses } = useCoursesStore.getState();
      const lesson = courses[0].outline?.sections[0].lessons[1];
      expect(lesson?.status).toBe('completed');
    });

    it('should set course position', () => {
      const course = createMockCourse({ id: 'test' });
      const position = {
        sectionId: 'section-1',
        lessonId: 'lesson-1-1',
        sectionIndex: 0,
        lessonIndex: 0,
      };

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().setCoursePosition('test', position);
      });

      const { courses } = useCoursesStore.getState();
      expect(courses[0].currentPosition).toEqual(position);
    });
  });

  describe('selectors', () => {
    it('should get lesson from course', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const lesson = useCoursesStore.getState().getLessonFromCourse('test', 'section-1', 'lesson-1-1');
      expect(lesson).toBeDefined();
      expect(lesson?.title).toBe('Welcome');
    });

    it('should return null for non-existent lesson', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const lesson = useCoursesStore.getState().getLessonFromCourse('test', 'section-1', 'non-existent');
      expect(lesson).toBeNull();
    });

    it('should get section lessons', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const lessons = useCoursesStore.getState().getSectionLessons('test', 'section-1');
      expect(lessons).toHaveLength(2);
    });

    it('should get next lesson in same section', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const nextPosition = useCoursesStore.getState().getNextLesson('test', 'section-1', 'lesson-1-1');
      expect(nextPosition).toEqual({
        sectionId: 'section-1',
        lessonId: 'lesson-1-2',
        sectionIndex: 0,
        lessonIndex: 1,
      });
    });

    it('should get first lesson in next section when at section end', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const nextPosition = useCoursesStore.getState().getNextLesson('test', 'section-1', 'lesson-1-2');
      expect(nextPosition).toEqual({
        sectionId: 'section-2',
        lessonId: 'lesson-2-1',
        sectionIndex: 1,
        lessonIndex: 0,
      });
    });

    it('should return null when at course end', () => {
      const course = createMockCourse({ id: 'test', outline: createMockOutline() });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const nextPosition = useCoursesStore.getState().getNextLesson('test', 'section-2', 'lesson-2-1');
      expect(nextPosition).toBeNull();
    });

    it('should get courses by status', () => {
      const active = createMockCourse({ id: 'active', status: 'active' });
      const archived = createMockCourse({ id: 'archived', status: 'archived' });
      const completed = createMockCourse({ id: 'completed', status: 'completed' });

      act(() => {
        useCoursesStore.getState().setCourses([active, archived, completed]);
      });

      const activeCourses = useCoursesStore.getState().getCoursesByStatus('active');
      expect(activeCourses).toHaveLength(1);
      expect(activeCourses[0].id).toBe('active');

      const archivedCourses = useCoursesStore.getState().getCoursesByStatus('archived');
      expect(archivedCourses).toHaveLength(1);
      expect(archivedCourses[0].id).toBe('archived');
    });
  });

  describe('cache operations', () => {
    it('should set list cache when setting courses', () => {
      const course = createMockCourse();

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const { listCache } = useCoursesStore.getState();
      expect(listCache).toBeDefined();
      expect(listCache?.timestamp).toBeGreaterThan(0);
    });

    it('should validate cache correctly', () => {
      const validCache = { timestamp: Date.now(), ttl: 300000 };
      const expiredCache = { timestamp: Date.now() - 600000, ttl: 300000 };

      const isValid = useCoursesStore.getState().isCacheValid(validCache);
      expect(isValid).toBe(true);

      const isExpired = useCoursesStore.getState().isCacheValid(expiredCache);
      expect(isExpired).toBe(false);

      const isNull = useCoursesStore.getState().isCacheValid(null);
      expect(isNull).toBe(false);
    });

    it('should get cached course', () => {
      const course = createMockCourse({ id: 'test' });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
      });

      const cached = useCoursesStore.getState().getCachedCourse('test');
      expect(cached).toEqual(course);
    });

    it('should invalidate course cache', () => {
      const course = createMockCourse({ id: 'test' });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().invalidateCourseCache('test');
      });

      const { coursesCache } = useCoursesStore.getState();
      expect(coursesCache.has('test')).toBe(false);
    });

    it('should clear all cache', () => {
      const course = createMockCourse({ id: 'test' });

      act(() => {
        useCoursesStore.getState().setCourses([course]);
        useCoursesStore.getState().clearAllCache();
      });

      const { coursesCache, listCache } = useCoursesStore.getState();
      expect(coursesCache.size).toBe(0);
      expect(listCache).toBeNull();
    });
  });

  describe('loading and error states', () => {
    it('should set loading state', () => {
      act(() => {
        useCoursesStore.getState().setLoading(true);
      });

      expect(useCoursesStore.getState().loading).toBe(true);

      act(() => {
        useCoursesStore.getState().setLoading(false);
      });

      expect(useCoursesStore.getState().loading).toBe(false);
    });

    it('should set error state', () => {
      act(() => {
        useCoursesStore.getState().setError('Test error');
      });

      expect(useCoursesStore.getState().error).toBe('Test error');

      act(() => {
        useCoursesStore.getState().setError(null);
      });

      expect(useCoursesStore.getState().error).toBeNull();
    });
  });
});
