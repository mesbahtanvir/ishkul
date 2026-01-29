/**
 * Tests for lesson status helper utilities
 *
 * Tests effective status derivation, status icons, and status colors
 */

import {
  getEffectiveLessonStatus,
  getLessonStatusIcon,
  getLessonStatusColor,
} from '../lessonStatusHelpers';
import { Lesson, LessonStatus, ContentStatus } from '../../types/app';

// Helper to create mock lesson
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: `lesson-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Lesson',
  description: 'Test description',
  estimatedMinutes: 15,
  status: 'pending' as LessonStatus,
  blocksStatus: 'pending' as ContentStatus,
  ...overrides,
});

// Mock theme colors
const mockColors = {
  success: '#00AA00',
  primary: '#0066FF',
  text: {
    primary: '#000000',
    secondary: '#666666',
  },
};

describe('getEffectiveLessonStatus', () => {
  describe('completed lessons', () => {
    it('should return completed for completed lesson', () => {
      const lesson = createMockLesson({ status: 'completed' });
      const result = getEffectiveLessonStatus(lesson, 0, 0);
      expect(result).toBe('completed');
    });

    it('should return completed regardless of position', () => {
      const lesson = createMockLesson({ status: 'completed' });
      expect(getEffectiveLessonStatus(lesson, 5, 3)).toBe('completed');
    });
  });

  describe('in_progress lessons', () => {
    it('should return in_progress for in_progress lesson', () => {
      const lesson = createMockLesson({ status: 'in_progress' });
      const result = getEffectiveLessonStatus(lesson, 0, 0);
      expect(result).toBe('in_progress');
    });

    it('should return in_progress regardless of blocksStatus', () => {
      const lesson = createMockLesson({
        status: 'in_progress',
        blocksStatus: 'pending',
      });
      expect(getEffectiveLessonStatus(lesson, 2, 1)).toBe('in_progress');
    });
  });

  describe('first lesson', () => {
    it('should always be unlocked (return actual status)', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: 'pending',
      });
      const result = getEffectiveLessonStatus(lesson, 0, 0);
      expect(result).toBe('pending');
    });

    it('should return pending even with no blocksStatus', () => {
      const lesson = createMockLesson({
        status: undefined as unknown as LessonStatus,
        blocksStatus: 'pending',
      });
      const result = getEffectiveLessonStatus(lesson, 0, 0);
      expect(result).toBe('pending');
    });
  });

  describe('lessons with generated blocks', () => {
    it('should return pending when blocksStatus is ready', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: 'ready',
      });
      const result = getEffectiveLessonStatus(lesson, 2, 1);
      expect(result).toBe('pending');
    });

    it('should return pending when blocksStatus is generating', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: 'generating',
      });
      const result = getEffectiveLessonStatus(lesson, 1, 0);
      expect(result).toBe('pending');
    });
  });

  describe('locked lessons', () => {
    it('should return locked when blocksStatus is pending', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: 'pending',
      });
      const result = getEffectiveLessonStatus(lesson, 1, 0);
      expect(result).toBe('locked');
    });

    it('should return locked when blocksStatus is undefined', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: undefined,
      });
      const result = getEffectiveLessonStatus(lesson, 2, 1);
      expect(result).toBe('locked');
    });

    it('should return locked for non-first lessons without block generation', () => {
      const lesson = createMockLesson({
        status: 'pending',
        blocksStatus: 'pending',
      });
      // Not first lesson (section 0, lesson 1)
      expect(getEffectiveLessonStatus(lesson, 1, 0)).toBe('locked');
      // Not first section
      expect(getEffectiveLessonStatus(lesson, 0, 1)).toBe('locked');
    });
  });
});

describe('getLessonStatusIcon', () => {
  it('should return checkmark for completed', () => {
    expect(getLessonStatusIcon('completed')).toBe('✅');
  });

  it('should return book for in_progress', () => {
    expect(getLessonStatusIcon('in_progress')).toBe('📖');
  });

  it('should return lock for locked', () => {
    expect(getLessonStatusIcon('locked')).toBe('🔒');
  });

  it('should return circle for pending', () => {
    expect(getLessonStatusIcon('pending')).toBe('⭕');
  });

  it('should return circle for unknown status', () => {
    expect(getLessonStatusIcon('unknown' as LessonStatus)).toBe('⭕');
  });
});

describe('getLessonStatusColor', () => {
  it('should return success color for completed', () => {
    const color = getLessonStatusColor('completed', mockColors as never);
    expect(color).toBe('#00AA00');
  });

  it('should return primary color for in_progress', () => {
    const color = getLessonStatusColor('in_progress', mockColors as never);
    expect(color).toBe('#0066FF');
  });

  it('should return secondary text color for locked', () => {
    const color = getLessonStatusColor('locked', mockColors as never);
    expect(color).toBe('#666666');
  });

  it('should return primary text color for pending', () => {
    const color = getLessonStatusColor('pending', mockColors as never);
    expect(color).toBe('#000000');
  });

  it('should return primary text color for unknown status', () => {
    const color = getLessonStatusColor('unknown' as LessonStatus, mockColors as never);
    expect(color).toBe('#000000');
  });
});
