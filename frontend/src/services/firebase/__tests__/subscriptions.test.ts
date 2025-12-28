/**
 * Tests for Firestore subscription helpers
 */

import { Course, Lesson, Section } from '../../../types/app';

// Mock Firestore
const mockUnsubscribe = jest.fn();
const mockOnSnapshot = jest.fn(() => mockUnsubscribe);
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

jest.mock('../index', () => ({
  getFirestoreClient: jest.fn(() => ({})),
}));

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
        outline: { sections: [] },
      };

      const mockSnapshot = {
        exists: () => true,
        data: () => mockCourseData,
        id: 'course-123',
      };

      // Capture the snapshot callback
      mockOnSnapshot.mockImplementation((ref, onNext) => {
        onNext(mockSnapshot);
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

      mockOnSnapshot.mockImplementation((ref, onNext) => {
        onNext(mockSnapshot);
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

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onError(mockError);
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

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onError(mockError);
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

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onError(mockError);
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

      mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
        onError(mockError);
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
        outline: { sections: [] },
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when lesson blocksStatus is pending', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                { id: 'lesson-1', title: 'Lesson 1', blocksStatus: 'pending' } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when lesson blocksStatus is generating', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                { id: 'lesson-1', title: 'Lesson 1', blocksStatus: 'generating' } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when block contentStatus is pending', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'pending' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return true when block contentStatus is generating', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'generating' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(hasPendingContent(course as Course)).toBe(true);
    });

    it('should return false when all content is ready', () => {
      const { hasPendingContent } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outlineStatus: 'ready',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'ready' },
                    { id: 'block-2', type: 'quiz', contentStatus: 'ready' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
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
        outline: {
          sections: [
            { id: 'section-1', title: 'Section 1', lessons: [] } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-2', 'lesson-1')).toBe(false);
    });

    it('should return false when lesson not found', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [{ id: 'lesson-1', title: 'Lesson 1' } as Lesson],
            } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-2')).toBe(false);
    });

    it('should return false when blocksStatus is not ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                { id: 'lesson-1', title: 'Lesson 1', blocksStatus: 'generating' } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return false when some blocks are not ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'ready' },
                    { id: 'block-2', type: 'quiz', contentStatus: 'generating' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(false);
    });

    it('should return true when all blocks are ready', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'ready' },
                    { id: 'block-2', type: 'quiz', contentStatus: 'ready' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(true);
    });

    it('should return true when blocks have error status (considered done)', () => {
      const { isLessonContentReady } = require('../subscriptions');
      const course: Partial<Course> = {
        id: 'course-1',
        outline: {
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  blocksStatus: 'ready',
                  blocks: [
                    { id: 'block-1', type: 'text', contentStatus: 'ready' },
                    { id: 'block-2', type: 'quiz', contentStatus: 'error' },
                  ],
                } as Lesson,
              ],
            } as Section,
          ],
        },
      };
      expect(isLessonContentReady(course as Course, 'section-1', 'lesson-1')).toBe(true);
    });
  });
});
