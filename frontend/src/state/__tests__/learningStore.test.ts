/**
 * Tests for learningStore
 *
 * Tests the learning session state management for block-based lessons
 */

import { act } from '@testing-library/react-native';
import { useLearningStore } from '../learningStore';
import { Block, LessonPosition } from '../../types/app';

// Helper to create a mock block
const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
  id: `block-${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  order: 0,
  title: 'Test Block',
  purpose: 'learning',
  contentStatus: 'ready',
  ...overrides,
});

// Helper to create a mock lesson position
const createMockPosition = (overrides: Partial<LessonPosition> = {}): LessonPosition => ({
  sectionId: 'section-1',
  lessonId: 'lesson-1',
  sectionIndex: 0,
  lessonIndex: 0,
  ...overrides,
});

describe('learningStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useLearningStore.getState().clearLesson();
    });
  });

  describe('initial state', () => {
    it('should start with null position and empty blocks', () => {
      const state = useLearningStore.getState();
      expect(state.currentPosition).toBeNull();
      expect(state.currentBlockIndex).toBe(0);
      expect(state.blocks).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('setCurrentPosition', () => {
    it('should set the current lesson position', () => {
      const position = createMockPosition();

      act(() => {
        useLearningStore.getState().setCurrentPosition(position);
      });

      expect(useLearningStore.getState().currentPosition).toEqual(position);
    });

    it('should allow setting position to null', () => {
      const position = createMockPosition();

      act(() => {
        useLearningStore.getState().setCurrentPosition(position);
        useLearningStore.getState().setCurrentPosition(null);
      });

      expect(useLearningStore.getState().currentPosition).toBeNull();
    });
  });

  describe('setBlocks', () => {
    it('should set blocks and reset block index to 0', () => {
      const blocks = [
        createMockBlock({ id: 'block-1', order: 0 }),
        createMockBlock({ id: 'block-2', order: 1 }),
        createMockBlock({ id: 'block-3', order: 2 }),
      ];

      // First set a non-zero index
      act(() => {
        useLearningStore.getState().setCurrentBlockIndex(2);
      });

      // Now set blocks - should reset index
      act(() => {
        useLearningStore.getState().setBlocks(blocks);
      });

      const state = useLearningStore.getState();
      expect(state.blocks).toHaveLength(3);
      expect(state.currentBlockIndex).toBe(0);
    });

    it('should handle empty blocks array', () => {
      act(() => {
        useLearningStore.getState().setBlocks([]);
      });

      expect(useLearningStore.getState().blocks).toEqual([]);
    });
  });

  describe('setCurrentBlockIndex', () => {
    it('should set the current block index', () => {
      act(() => {
        useLearningStore.getState().setCurrentBlockIndex(5);
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(5);
    });
  });

  describe('nextBlock', () => {
    it('should advance to the next block', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
        createMockBlock({ id: 'block-3' }),
      ];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
        useLearningStore.getState().nextBlock();
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(1);
    });

    it('should not advance past the last block', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
      ];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
        useLearningStore.getState().setCurrentBlockIndex(1); // At last block
        useLearningStore.getState().nextBlock();
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(1);
    });

    it('should not change index when blocks array is empty', () => {
      act(() => {
        useLearningStore.getState().nextBlock();
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(0);
    });
  });

  describe('previousBlock', () => {
    it('should go back to the previous block', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
        createMockBlock({ id: 'block-3' }),
      ];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
        useLearningStore.getState().setCurrentBlockIndex(2);
        useLearningStore.getState().previousBlock();
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(1);
    });

    it('should not go back past the first block', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
      ];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
        useLearningStore.getState().previousBlock();
      });

      expect(useLearningStore.getState().currentBlockIndex).toBe(0);
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      act(() => {
        useLearningStore.getState().setLoading(true);
      });

      expect(useLearningStore.getState().loading).toBe(true);
    });

    it('should set loading to false', () => {
      act(() => {
        useLearningStore.getState().setLoading(true);
        useLearningStore.getState().setLoading(false);
      });

      expect(useLearningStore.getState().loading).toBe(false);
    });
  });

  describe('clearLesson', () => {
    it('should reset all lesson state', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
      ];
      const position = createMockPosition();

      act(() => {
        useLearningStore.getState().setCurrentPosition(position);
        useLearningStore.getState().setBlocks(blocks);
        useLearningStore.getState().setCurrentBlockIndex(1);
        useLearningStore.getState().clearLesson();
      });

      const state = useLearningStore.getState();
      expect(state.currentPosition).toBeNull();
      expect(state.currentBlockIndex).toBe(0);
      expect(state.blocks).toEqual([]);
    });

    it('should preserve loading state after clear', () => {
      act(() => {
        useLearningStore.getState().setLoading(true);
        useLearningStore.getState().clearLesson();
      });

      // Loading is not cleared by clearLesson
      expect(useLearningStore.getState().loading).toBe(true);
    });
  });

  describe('block navigation edge cases', () => {
    it('should handle single block lesson', () => {
      const blocks = [createMockBlock({ id: 'block-1' })];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
      });

      // Try next - should stay at 0
      act(() => {
        useLearningStore.getState().nextBlock();
      });
      expect(useLearningStore.getState().currentBlockIndex).toBe(0);

      // Try previous - should stay at 0
      act(() => {
        useLearningStore.getState().previousBlock();
      });
      expect(useLearningStore.getState().currentBlockIndex).toBe(0);
    });

    it('should handle multiple navigations in sequence', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
        createMockBlock({ id: 'block-3' }),
        createMockBlock({ id: 'block-4' }),
      ];

      act(() => {
        useLearningStore.getState().setBlocks(blocks);
      });

      // Navigate forward three times
      act(() => {
        useLearningStore.getState().nextBlock();
        useLearningStore.getState().nextBlock();
        useLearningStore.getState().nextBlock();
      });
      expect(useLearningStore.getState().currentBlockIndex).toBe(3);

      // Navigate back twice
      act(() => {
        useLearningStore.getState().previousBlock();
        useLearningStore.getState().previousBlock();
      });
      expect(useLearningStore.getState().currentBlockIndex).toBe(1);
    });
  });
});
