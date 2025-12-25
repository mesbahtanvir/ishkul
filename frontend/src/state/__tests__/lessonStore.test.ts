/**
 * Tests for lessonStore
 *
 * Tests the lesson state management for the 3-stage block-based content system
 */

import { act, waitFor } from '@testing-library/react-native';
import { useLessonStore } from '../lessonStore';
import { lessonsApi } from '../../services/api';
import { Block, Lesson, BlockContent, ContentStatus } from '../../types/app';

// Mock the API module
jest.mock('../../services/api', () => ({
  lessonsApi: {
    getLesson: jest.fn(),
    generateBlocks: jest.fn(),
    generateBlockContent: jest.fn(),
    completeBlock: jest.fn(),
    updateLessonProgress: jest.fn(),
  },
}));

// Helper to create a mock block
const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
  id: `block-${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  order: 0,
  title: 'Test Block',
  purpose: 'learning',
  contentStatus: 'ready' as ContentStatus,
  ...overrides,
});

// Helper to create a mock lesson
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-1',
  title: 'Test Lesson',
  description: 'A test lesson',
  estimatedMinutes: 30,
  blocksStatus: 'ready' as ContentStatus,
  status: 'pending',
  blocks: [],
  ...overrides,
});

// Helper to create mock text content
const createMockTextContent = (): BlockContent => ({
  text: {
    markdown: '# Hello World\n\nThis is test content.',
  },
});

describe('lessonStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useLessonStore.getState().clearLesson();
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with null lesson and default values', () => {
      const state = useLessonStore.getState();
      expect(state.currentLesson).toBeNull();
      expect(state.currentCourseId).toBeNull();
      expect(state.currentSectionId).toBeNull();
      expect(state.currentBlockIndex).toBe(0);
      expect(state.activeBlock).toBeNull();
      expect(state.lessonLoading).toBe(false);
      expect(state.blocksGenerating).toBe(false);
      expect(state.blockContentGenerating).toBeNull();
      expect(state.completing).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setCurrentLesson', () => {
    it('should set the current lesson', () => {
      const lesson = createMockLesson({ id: 'lesson-123' });

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson, 'course-1', 'section-1');
      });

      const state = useLessonStore.getState();
      expect(state.currentLesson).toEqual(lesson);
      expect(state.currentCourseId).toBe('course-1');
      expect(state.currentSectionId).toBe('section-1');
      expect(state.currentBlockIndex).toBe(0);
    });

    it('should reset block index when setting new lesson', () => {
      // Create lessons with enough blocks to navigate
      const lesson1 = createMockLesson({
        id: 'lesson-1',
        blocks: [
          createMockBlock({ id: 'b1', order: 0 }),
          createMockBlock({ id: 'b2', order: 1 }),
          createMockBlock({ id: 'b3', order: 2 }),
          createMockBlock({ id: 'b4', order: 3 }),
          createMockBlock({ id: 'b5', order: 4 }),
          createMockBlock({ id: 'b6', order: 5 }),
        ],
      });
      const lesson2 = createMockLesson({ id: 'lesson-2' });

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson1, 'c1', 's1');
      });

      act(() => {
        useLessonStore.getState().setCurrentBlockIndex(5);
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(5);

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson2, 'c1', 's1');
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(0);
    });

    it('should preserve course/section IDs if not provided', () => {
      const lesson = createMockLesson();

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson, 'course-1', 'section-1');
        useLessonStore.getState().setCurrentLesson(createMockLesson({ id: 'lesson-2' }));
      });

      const state = useLessonStore.getState();
      expect(state.currentCourseId).toBe('course-1');
      expect(state.currentSectionId).toBe('section-1');
    });
  });

  describe('fetchLesson', () => {
    it('should fetch and set lesson from API', async () => {
      const mockLesson = createMockLesson({
        id: 'fetched-lesson',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: mockLesson,
      });

      await act(async () => {
        await useLessonStore.getState().fetchLesson('course-1', 'lesson-1', 'section-1');
      });

      const state = useLessonStore.getState();
      expect(state.currentLesson?.id).toBe('fetched-lesson');
      expect(state.lessonLoading).toBe(false);
      expect(lessonsApi.getLesson).toHaveBeenCalledWith('course-1', 'section-1', 'lesson-1');
    });

    it('should set error on fetch failure', async () => {
      (lessonsApi.getLesson as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useLessonStore.getState().fetchLesson('course-1', 'lesson-1', 'section-1');
      });

      const state = useLessonStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.lessonLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let loadingDuringFetch = false;

      (lessonsApi.getLesson as jest.Mock).mockImplementation(() => {
        loadingDuringFetch = useLessonStore.getState().lessonLoading;
        return Promise.resolve({ lesson: createMockLesson() });
      });

      await act(async () => {
        await useLessonStore.getState().fetchLesson('c', 'l', 's');
      });

      expect(loadingDuringFetch).toBe(true);
    });
  });

  describe('generateBlocks', () => {
    it('should generate blocks and update lesson', async () => {
      const mockBlocks = [
        createMockBlock({ id: 'b1', type: 'text', contentStatus: 'pending' }),
        createMockBlock({ id: 'b2', type: 'code', contentStatus: 'pending' }),
      ];

      (lessonsApi.generateBlocks as jest.Mock).mockResolvedValue({
        blocks: mockBlocks,
      });

      // First set up a lesson
      act(() => {
        useLessonStore.getState().setCurrentLesson(
          createMockLesson({ id: 'lesson-1', blocksStatus: 'pending' }),
          'course-1',
          'section-1'
        );
      });

      await act(async () => {
        await useLessonStore.getState().generateBlocks('course-1', 'section-1', 'lesson-1');
      });

      const state = useLessonStore.getState();
      expect(state.currentLesson?.blocks).toHaveLength(2);
      expect(state.currentLesson?.blocksStatus).toBe('ready');
      expect(state.blocksGenerating).toBe(false);
    });

    it('should set error on generation failure', async () => {
      (lessonsApi.generateBlocks as jest.Mock).mockRejectedValue(new Error('LLM timeout'));

      act(() => {
        useLessonStore.getState().setCurrentLesson(createMockLesson({ id: 'lesson-1' }));
      });

      await act(async () => {
        await useLessonStore.getState().generateBlocks('c', 's', 'lesson-1');
      });

      // Error message comes from the thrown error
      expect(useLessonStore.getState().error).toBe('LLM timeout');
    });
  });

  describe('generateBlockContent', () => {
    it('should generate content for a specific block', async () => {
      const mockContent = createMockTextContent();
      const initialLesson = createMockLesson({
        id: 'lesson-1',
        blocks: [
          createMockBlock({ id: 'b1', contentStatus: 'pending' }),
          createMockBlock({ id: 'b2', contentStatus: 'pending' }),
        ],
      });

      (lessonsApi.generateBlockContent as jest.Mock).mockResolvedValue({
        content: mockContent,
      });

      act(() => {
        useLessonStore.getState().setCurrentLesson(initialLesson, 'c', 's');
      });

      await act(async () => {
        await useLessonStore.getState().generateBlockContent('c', 's', 'lesson-1', 'b1');
      });

      const state = useLessonStore.getState();
      const block = state.currentLesson?.blocks?.find(b => b.id === 'b1');
      expect(block?.content).toEqual(mockContent);
      expect(block?.contentStatus).toBe('ready');
    });

    it('should mark block as error on failure', async () => {
      (lessonsApi.generateBlockContent as jest.Mock).mockRejectedValue(new Error('Generation failed'));

      act(() => {
        useLessonStore.getState().setCurrentLesson(
          createMockLesson({
            id: 'lesson-1',
            blocks: [createMockBlock({ id: 'b1', contentStatus: 'pending' })],
          }),
          'c',
          's'
        );
      });

      await act(async () => {
        await useLessonStore.getState().generateBlockContent('c', 's', 'lesson-1', 'b1');
      });

      const block = useLessonStore.getState().currentLesson?.blocks?.find(b => b.id === 'b1');
      expect(block?.contentStatus).toBe('error');
    });

    it('should track generating state with block ID', async () => {
      let generatingId: string | null = null;

      (lessonsApi.generateBlockContent as jest.Mock).mockImplementation(() => {
        generatingId = useLessonStore.getState().blockContentGenerating;
        return Promise.resolve({ content: createMockTextContent() });
      });

      act(() => {
        useLessonStore.getState().setCurrentLesson(
          createMockLesson({
            id: 'l1',
            blocks: [createMockBlock({ id: 'block-xyz', contentStatus: 'pending' })],
          }),
          'c',
          's'
        );
      });

      await act(async () => {
        await useLessonStore.getState().generateBlockContent('c', 's', 'l1', 'block-xyz');
      });

      expect(generatingId).toBe('block-xyz');
      expect(useLessonStore.getState().blockContentGenerating).toBeNull();
    });
  });

  describe('block navigation', () => {
    beforeEach(() => {
      const lesson = createMockLesson({
        blocks: [
          createMockBlock({ id: 'b1', order: 0 }),
          createMockBlock({ id: 'b2', order: 1 }),
          createMockBlock({ id: 'b3', order: 2 }),
        ],
      });

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson, 'c', 's');
      });
    });

    it('should navigate to next block', () => {
      act(() => {
        useLessonStore.getState().nextBlock();
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(1);
    });

    it('should not go past last block', () => {
      act(() => {
        useLessonStore.getState().setCurrentBlockIndex(2);
        useLessonStore.getState().nextBlock();
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(2);
    });

    it('should navigate to previous block', () => {
      act(() => {
        useLessonStore.getState().setCurrentBlockIndex(2);
        useLessonStore.getState().previousBlock();
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(1);
    });

    it('should not go before first block', () => {
      act(() => {
        useLessonStore.getState().previousBlock();
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(0);
    });

    it('should go to specific block by ID', () => {
      act(() => {
        useLessonStore.getState().goToBlock('b3');
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(2);
    });

    it('should not change index for non-existent block', () => {
      act(() => {
        useLessonStore.getState().setCurrentBlockIndex(1);
        useLessonStore.getState().goToBlock('nonexistent');
      });

      expect(useLessonStore.getState().currentBlockIndex).toBe(1);
    });

    it('should clear active block on navigation', () => {
      act(() => {
        useLessonStore.getState().setActiveBlock(createMockBlock());
        useLessonStore.getState().nextBlock();
      });

      expect(useLessonStore.getState().activeBlock).toBeNull();
    });
  });

  describe('getCurrentBlock', () => {
    it('should return the current block', () => {
      const blocks = [
        createMockBlock({ id: 'b1' }),
        createMockBlock({ id: 'b2' }),
      ];

      act(() => {
        useLessonStore.getState().setCurrentLesson(
          createMockLesson({ blocks }),
          'c',
          's'
        );
        useLessonStore.getState().setCurrentBlockIndex(1);
      });

      const currentBlock = useLessonStore.getState().getCurrentBlock();
      expect(currentBlock?.id).toBe('b2');
    });

    it('should return null for empty blocks', () => {
      act(() => {
        useLessonStore.getState().setCurrentLesson(createMockLesson({ blocks: [] }), 'c', 's');
      });

      expect(useLessonStore.getState().getCurrentBlock()).toBeNull();
    });

    it('should return null when no lesson', () => {
      expect(useLessonStore.getState().getCurrentBlock()).toBeNull();
    });
  });

  describe('completeBlock', () => {
    it('should complete block and track in progress', async () => {
      (lessonsApi.completeBlock as jest.Mock).mockResolvedValue({});

      act(() => {
        useLessonStore.getState().setCurrentLesson(
          createMockLesson({
            id: 'lesson-1',
            blocks: [createMockBlock({ id: 'b1' })],
          }),
          'c',
          's'
        );
        useLessonStore.getState().setActiveBlock(createMockBlock({ id: 'b1' }));
      });

      await act(async () => {
        await useLessonStore.getState().completeBlock('c', 's', 'lesson-1', 'b1');
      });

      const state = useLessonStore.getState();
      expect(state.localProgress?.completedBlocks).toContain('b1');
      expect(state.completing).toBe(false);
    });
  });

  describe('isLessonComplete', () => {
    it('should return true when all blocks completed', () => {
      const lesson = createMockLesson({
        blocks: [
          createMockBlock({ id: 'b1' }),
          createMockBlock({ id: 'b2' }),
        ],
      });

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson, 'c', 's');
        useLessonStore.getState().updateLocalProgress({
          completedBlocks: ['b1', 'b2'],
        });
      });

      expect(useLessonStore.getState().isLessonComplete()).toBe(true);
    });

    it('should return false when blocks remain', () => {
      const lesson = createMockLesson({
        blocks: [
          createMockBlock({ id: 'b1' }),
          createMockBlock({ id: 'b2' }),
        ],
      });

      act(() => {
        useLessonStore.getState().setCurrentLesson(lesson, 'c', 's');
        useLessonStore.getState().updateLocalProgress({
          completedBlocks: ['b1'],
        });
      });

      expect(useLessonStore.getState().isLessonComplete()).toBe(false);
    });
  });

  describe('clearLesson', () => {
    it('should reset all lesson state', () => {
      act(() => {
        useLessonStore.getState().setCurrentLesson(createMockLesson(), 'c', 's');
        useLessonStore.getState().setCurrentBlockIndex(3);
        useLessonStore.getState().setError('some error');
        useLessonStore.getState().clearLesson();
      });

      const state = useLessonStore.getState();
      expect(state.currentLesson).toBeNull();
      expect(state.currentCourseId).toBeNull();
      expect(state.currentSectionId).toBeNull();
      expect(state.currentBlockIndex).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe('getNextPendingBlock', () => {
    it('should find next pending block', () => {
      const blocks = [
        createMockBlock({ id: 'b1', contentStatus: 'ready' }),
        createMockBlock({ id: 'b2', contentStatus: 'pending' }),
        createMockBlock({ id: 'b3', contentStatus: 'pending' }),
      ];

      act(() => {
        useLessonStore.getState().setCurrentLesson(createMockLesson({ blocks }), 'c', 's');
      });

      const pending = useLessonStore.getState().getNextPendingBlock();
      expect(pending?.id).toBe('b2');
    });

    it('should return null when no pending blocks', () => {
      const blocks = [
        createMockBlock({ id: 'b1', contentStatus: 'ready' }),
        createMockBlock({ id: 'b2', contentStatus: 'ready' }),
      ];

      act(() => {
        useLessonStore.getState().setCurrentLesson(createMockLesson({ blocks }), 'c', 's');
      });

      expect(useLessonStore.getState().getNextPendingBlock()).toBeNull();
    });
  });
});
