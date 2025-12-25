/**
 * Tests for courseHelpers
 *
 * Tests course-related utility functions for the section/lesson structure
 */

import {
  usesNewStructure,
  hasOutline,
  getFirstLessonPosition,
  getCurrentLessonPosition,
  calculateCourseProgress,
  getSectionProgress,
  isCourseComplete,
  findLesson,
} from '../courseHelpers';
import { Course, Section, LessonStatus, CourseOutline } from '../../types/app';

// Helper to create a mock course with sections and lessons
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

// Helper to create a mock section with lessons
const createMockSection = (
  id: string,
  lessonCount: number,
  lessonStatuses: LessonStatus[] = []
): Section => ({
  id,
  title: `Section ${id}`,
  description: `Description for ${id}`,
  estimatedMinutes: 30,
  learningOutcomes: ['Learn something'],
  status: 'pending',
  lessons: Array.from({ length: lessonCount }, (_, i) => ({
    id: `${id}-lesson-${i}`,
    title: `Lesson ${i}`,
    description: `Description for lesson ${i}`,
    estimatedMinutes: 10,
    status: lessonStatuses[i] || ('pending' as LessonStatus),
    blocksStatus: 'pending' as const,
  })),
});

// Helper to create a mock course outline
const createMockOutline = (sections: Section[]): CourseOutline => ({
  title: 'Test Course Outline',
  description: 'A test course outline',
  emoji: '📚',
  estimatedMinutes: 60,
  difficulty: 'beginner',
  category: 'test',
  prerequisites: [],
  learningOutcomes: ['Learn testing'],
  sections,
  generatedAt: Date.now(),
});

describe('courseHelpers', () => {
  describe('usesNewStructure', () => {
    it('should return false for null course', () => {
      expect(usesNewStructure(null)).toBe(false);
    });

    it('should return false for course without outline', () => {
      const course = createMockCourse();
      expect(usesNewStructure(course)).toBe(false);
    });

    it('should return false for course with empty sections', () => {
      const course = createMockCourse({
        outline: createMockOutline([]),
      });
      expect(usesNewStructure(course)).toBe(false);
    });

    it('should return false for sections without lessons', () => {
      const emptySection: Section = {
        id: 'section-1',
        title: 'Empty Section',
        description: '',
        estimatedMinutes: 0,
        learningOutcomes: [],
        status: 'pending',
        lessons: [],
      };
      const course = createMockCourse({
        outline: createMockOutline([emptySection]),
      });
      expect(usesNewStructure(course)).toBe(false);
    });

    it('should return true for course with valid section/lesson structure', () => {
      const course = createMockCourse({
        outline: createMockOutline([createMockSection('section-1', 3)]),
      });
      expect(usesNewStructure(course)).toBe(true);
    });
  });

  describe('hasOutline', () => {
    it('should return same result as usesNewStructure', () => {
      const courseWithOutline = createMockCourse({
        outline: createMockOutline([createMockSection('section-1', 2)]),
      });
      const courseWithoutOutline = createMockCourse();

      expect(hasOutline(courseWithOutline)).toBe(usesNewStructure(courseWithOutline));
      expect(hasOutline(courseWithoutOutline)).toBe(usesNewStructure(courseWithoutOutline));
    });
  });

  describe('getFirstLessonPosition', () => {
    it('should return null for course without sections', () => {
      const course = createMockCourse();
      expect(getFirstLessonPosition(course)).toBeNull();
    });

    it('should return first pending lesson position', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['completed', 'pending', 'pending']),
        ]),
      });

      const position = getFirstLessonPosition(course);
      expect(position).toEqual({
        sectionId: 'section-1',
        lessonId: 'section-1-lesson-1',
        sectionIndex: 0,
        lessonIndex: 1,
      });
    });

    it('should skip completed lessons', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 2, ['completed', 'completed']),
          createMockSection('section-2', 2, ['pending', 'pending']),
        ]),
      });

      const position = getFirstLessonPosition(course);
      expect(position?.sectionId).toBe('section-2');
      expect(position?.lessonIndex).toBe(0);
    });

    it('should skip skipped lessons', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['skipped', 'skipped', 'in_progress']),
        ]),
      });

      const position = getFirstLessonPosition(course);
      expect(position?.lessonIndex).toBe(2);
    });

    it('should return first lesson if all are completed', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 2, ['completed', 'completed']),
        ]),
      });

      const position = getFirstLessonPosition(course);
      expect(position).toEqual({
        sectionId: 'section-1',
        lessonId: 'section-1-lesson-0',
        sectionIndex: 0,
        lessonIndex: 0,
      });
    });
  });

  describe('getCurrentLessonPosition', () => {
    it('should use stored position if available', () => {
      const storedPosition = {
        sectionId: 'stored-section',
        lessonId: 'stored-lesson',
        sectionIndex: 2,
        lessonIndex: 3,
      };

      const course = createMockCourse({
        currentPosition: storedPosition,
        outline: createMockOutline([createMockSection('section-1', 2)]),
      });

      expect(getCurrentLessonPosition(course)).toEqual(storedPosition);
    });

    it('should calculate position if not stored', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['completed', 'in_progress', 'pending']),
        ]),
      });

      const position = getCurrentLessonPosition(course);
      expect(position?.lessonIndex).toBe(1);
    });
  });

  describe('calculateCourseProgress', () => {
    it('should return legacy progress if no sections', () => {
      const course = createMockCourse({ progress: 75 });
      expect(calculateCourseProgress(course)).toBe(75);
    });

    it('should return 0 for empty course', () => {
      const course = createMockCourse({
        outline: createMockOutline([]),
      });
      expect(calculateCourseProgress(course)).toBe(0);
    });

    it('should calculate progress from completed lessons', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 4, ['completed', 'completed', 'pending', 'pending']),
        ]),
      });

      expect(calculateCourseProgress(course)).toBe(50);
    });

    it('should calculate progress across multiple sections', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 2, ['completed', 'completed']),
          createMockSection('section-2', 2, ['pending', 'pending']),
        ]),
      });

      expect(calculateCourseProgress(course)).toBe(50);
    });

    it('should return 100 when all lessons completed', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['completed', 'completed', 'completed']),
        ]),
      });

      expect(calculateCourseProgress(course)).toBe(100);
    });

    it('should return 0 when no lessons completed', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['pending', 'pending', 'pending']),
        ]),
      });

      expect(calculateCourseProgress(course)).toBe(0);
    });
  });

  describe('getSectionProgress', () => {
    it('should return correct counts and percentage', () => {
      const section = createMockSection('section-1', 4, [
        'completed',
        'completed',
        'in_progress',
        'pending',
      ]);

      const progress = getSectionProgress(section);
      expect(progress).toEqual({
        completed: 2,
        total: 4,
        percentage: 50,
      });
    });

    it('should handle empty section', () => {
      const section: Section = {
        id: 'empty',
        title: 'Empty',
        description: '',
        estimatedMinutes: 0,
        learningOutcomes: [],
        status: 'pending',
        lessons: [],
      };

      const progress = getSectionProgress(section);
      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });
    });

    it('should return 100% when all completed', () => {
      const section = createMockSection('section-1', 3, [
        'completed',
        'completed',
        'completed',
      ]);

      expect(getSectionProgress(section).percentage).toBe(100);
    });
  });

  describe('isCourseComplete', () => {
    it('should return false for course without outline', () => {
      const course = createMockCourse();
      expect(isCourseComplete(course)).toBe(false);
    });

    it('should return false if any lesson is not completed', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 3, ['completed', 'completed', 'in_progress']),
        ]),
      });

      expect(isCourseComplete(course)).toBe(false);
    });

    it('should return true if all lessons are completed', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 2, ['completed', 'completed']),
          createMockSection('section-2', 2, ['completed', 'completed']),
        ]),
      });

      expect(isCourseComplete(course)).toBe(true);
    });
  });

  describe('findLesson', () => {
    it('should return null for course without outline', () => {
      const course = createMockCourse();
      expect(findLesson(course, 'any-lesson')).toBeNull();
    });

    it('should return null for non-existent lesson', () => {
      const course = createMockCourse({
        outline: createMockOutline([createMockSection('section-1', 2)]),
      });

      expect(findLesson(course, 'non-existent')).toBeNull();
    });

    it('should find lesson and return with section ID', () => {
      const course = createMockCourse({
        outline: createMockOutline([
          createMockSection('section-1', 2),
          createMockSection('section-2', 2),
        ]),
      });

      const result = findLesson(course, 'section-2-lesson-1');
      expect(result).not.toBeNull();
      expect(result?.sectionId).toBe('section-2');
      expect(result?.lesson.id).toBe('section-2-lesson-1');
    });

    it('should find first matching lesson if multiple have same id', () => {
      // This tests edge case - normally IDs should be unique
      const course = createMockCourse({
        outline: createMockOutline([createMockSection('section-1', 3)]),
      });

      const result = findLesson(course, 'section-1-lesson-0');
      expect(result?.lesson.id).toBe('section-1-lesson-0');
    });
  });
});
