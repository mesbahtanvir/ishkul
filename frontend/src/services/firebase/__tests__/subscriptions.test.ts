/**
 * Tests for Firestore subscription helpers
 */

import { Course, CourseOutline, Lesson, Section, Block } from '../../../types/app';

// Mock Firestore
const mockUnsubscribe = jest.fn();
type OnSnapshotFn = (ref: unknown, onNext: unknown, onError?: unknown) => () => void;
const mockOnSnapshot = jest.fn<ReturnType<OnSnapshotFn>, Parameters<OnSnapshotFn>>(
  () => mockUnsubscribe
);
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (db: unknown, ...path: string[]) => mockDoc(db, ...path),
  onSnapshot: (ref: unknown, onNext: unknown, onError?: unknown) => mockOnSnapshot(ref, onNext, onError),
}));

jest.mock('../index', () => ({
  getFirestoreClient: jest.fn(() => ({})),
}));

jest.mock('../auth', () => ({
  getCurrentFirebaseUser: jest.fn(() => ({ uid: 'test-user-123' })),
}));

// Helper to create a complete mock CourseOutline
const createMockOutline = (sections: Section[] = []): CourseOutline => ({
  title: 'Test Course',
  description: 'Test description',
  emoji: '📚',
  estimatedMinutes: 60,
  difficulty: 'beginner',
  category: 'test',
  prerequisites: [],
  learningOutcomes: ['Learn testing'],
  sections,
  generatedAt: Date.now(),
});

// Helper to create a complete mock Section
const createMockSection = (
  id: string,
  title: string,
  lessons: Lesson[] = []
): Section => ({
  id,
  title,
  description: 'Section description',
  estimatedMinutes: 30,
  learningOutcomes: ['Outcome 1'],
  lessons,
  status: 'pending',
});

// Helper to create a complete mock Lesson
const createMockLesson = (
  id: string,
  title: string,
  blocksStatus: 'pending' | 'generating' | 'ready' | 'error' = 'ready',
  blocks?: Block[]
): Lesson => ({
  id,
  title,
  description: 'Lesson description',
  estimatedMinutes: 10,
  blocksStatus,
  status: 'pending',
  blocks,
});

// Helper to create a complete mock Block
const createMockBlock = (
  id: string,
  type: 'text' | 'question' = 'text',
  contentStatus: 'pending' | 'generating' | 'ready' | 'error' = 'ready'
): Block => ({
  id,
  type,
  title: `Block ${id}`,
  purpose: 'Learn content',
  order: 0,
  contentStatus,
});

describe('Firestore subscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToCourse', () => {
    it('should subscribe to course document', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const onUpdate = jest.fn();
      const onError = jest.fn();

      const unsubscribe = subscribeToCourse('course-123', onUpdate, onError);

      expect(mockDoc).toHaveBeenCalledWith({}, 'courses', 'course-123');
      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should call onUpdate when document snapshot exists', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockCourseData: Partial<Course> = {
        title: 'Test Course',
        outline: createMockOutline(),
      };

      const mockSnapshot = {
        exists: () => true,
        data: () => mockCourseData,
        id: 'course-123',
      };

      // Capture the snapshot callback
      mockOnSnapshot.mockImplementation((_ref: unknown, onNext: unknown) => {
        (onNext as (snapshot: typeof mockSnapshot) => void)(mockSnapshot);
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();
      subscribeToCourse('course-123', onUpdate);

      expect(onUpdate).toHaveBeenCalledWith({
        ...mockCourseData,
        id: 'course-123',
      });
    });

    it('should not call onUpdate when document does not exist', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockSnapshot = {
        exists: () => false,
        data: () => null,
        id: 'course-123',
      };

      mockOnSnapshot.mockImplementation((_ref: unknown, onNext: unknown) => {
        (onNext as (snapshot: typeof mockSnapshot) => void)(mockSnapshot);
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();
      subscribeToCourse('course-123', onUpdate);

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should call onError when Firestore error occurs', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockError = {
        code: 'permission-denied',
        message: 'Permission denied',
      };

      mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onError?: unknown) => {
        (onError as (error: typeof mockError) => void)(mockError);
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();
      const onError = jest.fn();
      subscribeToCourse('course-123', onUpdate, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'permission-denied',
          message: 'You do not have permission to access this content.',
        })
      );
    });

    it('should map not-found error correctly', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockError = {
        code: 'not-found',
        message: 'Document not found',
      };

      mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onError?: unknown) => {
        (onError as (error: typeof mockError) => void)(mockError);
        return mockUnsubscribe;
      });

      const onError = jest.fn();
      subscribeToCourse('course-123', jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'not-found',
          message: 'The requested content was not found.',
        })
      );
    });

    it('should map unavailable error correctly', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockError = {
        code: 'unavailable',
        message: 'Service unavailable',
      };

      mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onError?: unknown) => {
        (onError as (error: typeof mockError) => void)(mockError);
        return mockUnsubscribe;
      });

      const onError = jest.fn();
      subscribeToCourse('course-123', jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unavailable',
          message: 'Connection lost. Retrying...',
        })
      );
    });

    it('should map unknown error correctly', () => {
      const { subscribeToCourse } = require('../subscriptions');

      const mockError = {
        code: 'unknown-error',
        message: 'Something went wrong',
      };

      mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onError?: unknown) => {
        (onError as (error: typeof mockError) => void)(mockError);
        return mockUnsubscribe;
      });

      const onError = jest.fn();
      subscribeToCourse('course-123', jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unknown',
          message: 'An unexpected error occurred.',
        })
      );
    });
  });

  describe('hasPendingContent', () => {
    it('should return false for null course', () => {
      const { hasPendingContent } = require('../subscriptions');
      expect(hasPendingContent(null)).toBe(false);
    });

    it('should return false for course without outline', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = { id: 'course-1' };
      expect(hasPendingContent(course as Course)).toBe(false);
    });

    it('should return false for course without sections', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {} as Course['outline'],
      };
      expect(hasPendingContent(course as Course)).toBe(false);
    });

    it('should return true when outlineStatus is generating', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'generating',
        outline: createMockOutline(),
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when lesson blocksStatus is pending', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'pending'),
          ]),
        ]),
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when lesson blocksStatus is generating', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'generating'),
          ]),
        ]),
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when block contentStatus is pending', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'pending'),
            ]),
          ]),
        ]),
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when block contentStatus is generating', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'generating'),
            ]),
          ]),
        ]),
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return false when all content is ready', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'ready'),
              createMockBlock('block-2', 'question', 'ready'),
            ]),
          ]),
        ]),
      };
      expect(hasPendingContent(course as Course)).toBe(false);
    });
  });

  describe('isLessonContentReady', () => {
    it('should return false for null course', () => {
      const { isLessonContentReady } = require('../subscriptions');
      expect(isLessonContentReady(null, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return false for course without outline', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = { id: 'course-1' };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return false when section not found', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1'),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-2', 'lesson-1')).toBe(false);
    });

    it('should return false when lesson not found', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1'),
          ]),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-2')).toBe(false);
    });

    it('should return false when blocksStatus is not ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'generating'),
          ]),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return false when some blocks are not ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'ready'),
              createMockBlock('block-2', 'question', 'generating'),
            ]),
          ]),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return true when all blocks are ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'ready'),
              createMockBlock('block-2', 'question', 'ready'),
            ]),
          ]),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(true);
    });

    it('should return true when blocks have error status (considered done)', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: createMockOutline([
          createMockSection('section-1', 'Section 1', [
            createMockLesson('lesson-1', 'Lesson 1', 'ready', [
              createMockBlock('block-1', 'text', 'ready'),
              createMockBlock('block-2', 'question', 'error'),
            ]),
          ]),
        ]),
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(true);
    });
  });
});
