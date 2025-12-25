/**
 * Tests for useLesson hook
 *
 * Tests the custom hook for managing lesson flow including:
 * - Auto-generation of blocks and content
 * - Block progression and navigation
 * - Block interaction (start, answer, complete)
 * - Lesson completion
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLesson } from '../useLesson';
import { useLessonStore } from '../../state/lessonStore';
import { useCoursesStore } from '../../state/coursesStore';
import { lessonsApi } from '../../services/api';
import { Block, Lesson, ContentStatus, Course } from '../../types/app';

// Mock the API
jest.mock('../../services/api', () => ({
  lessonsApi: {
    getLesson: jest.fn(),
    generateBlocks: jest.fn(),
    generateBlockContent: jest.fn(),
    completeBlock: jest.fn(),
    updateLessonProgress: jest.fn(),
  },
}));

// Helper to create mock blocks
const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
  id: `block-${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  order: 0,
  title: 'Test Block',
  purpose: 'learning',
  contentStatus: 'ready' as ContentStatus,
  content: { text: { markdown: 'Test content' } },
  ...overrides,
});

// Helper to create mock lessons
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

// Helper to create mock course with outline
const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  userId: 'user-1',
  title: 'Test Course',
  emoji: '📚',
  status: 'active',
  progress: 0,
  lessonsCompleted: 0,
  totalLessons: 3,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastAccessedAt: Date.now(),
  outline: {
    title: 'Test Course',
    description: 'A test course description',
    emoji: '📚',
    estimatedMinutes: 90,
    difficulty: 'beginner',
    category: 'test',
    prerequisites: [],
    learningOutcomes: [],
    generatedAt: Date.now(),
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        description: 'Section 1 description',
        estimatedMinutes: 60,
        learningOutcomes: [],
        status: 'pending',
        lessons: [
          { id: 'lesson-1', title: 'Lesson 1', description: 'Lesson 1 desc', estimatedMinutes: 30, status: 'pending', blocksStatus: 'pending' as ContentStatus },
          { id: 'lesson-2', title: 'Lesson 2', description: 'Lesson 2 desc', estimatedMinutes: 30, status: 'pending', blocksStatus: 'pending' as ContentStatus },
        ],
      },
      {
        id: 'section-2',
        title: 'Section 2',
        description: 'Section 2 description',
        estimatedMinutes: 30,
        learningOutcomes: [],
        status: 'pending',
        lessons: [
          { id: 'lesson-3', title: 'Lesson 3', description: 'Lesson 3 desc', estimatedMinutes: 30, status: 'pending', blocksStatus: 'pending' as ContentStatus },
        ],
      },
    ],
  },
  ...overrides,
});

describe('useLesson', () => {
  const defaultOptions = {
    courseId: 'course-1',
    lessonId: 'lesson-1',
    sectionId: 'section-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset stores
    act(() => {
      useLessonStore.getState().clearLesson();
      useCoursesStore.getState().clearCourses();
    });
  });

  describe('initialization', () => {
    it('should fetch lesson on mount', async () => {
      const mockLesson = createMockLesson({
        id: 'lesson-1',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: mockLesson,
      });

      const { result } = renderHook(() => useLesson(defaultOptions));

      await waitFor(() => {
        expect(lessonsApi.getLesson).toHaveBeenCalledWith(
          'course-1',
          'section-1',
          'lesson-1'
        );
      });

      await waitFor(() => {
        expect(result.current.lesson).toEqual(mockLesson);
      });
    });

    it('should use initialLesson if provided while fetching', async () => {
      const initialLesson = createMockLesson({ id: 'lesson-1', title: 'Initial' });
      const fetchedLesson = createMockLesson({ id: 'lesson-1', title: 'Fetched' });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: fetchedLesson,
      });

      const { result } = renderHook(() =>
        useLesson({
          ...defaultOptions,
          initialLesson,
        })
      );

      // Initially should show the initial lesson
      expect(result.current.lesson?.title).toBe('Initial');

      // After fetch completes, should show fetched lesson
      await waitFor(() => {
        expect(result.current.lesson?.title).toBe('Fetched');
      });
    });

    it('should report loading state during fetch', async () => {
      let resolvePromise: (value: { lesson: Lesson }) => void;
      const fetchPromise = new Promise<{ lesson: Lesson }>((resolve) => {
        resolvePromise = resolve;
      });
      (lessonsApi.getLesson as jest.Mock).mockReturnValue(fetchPromise);

      const { result } = renderHook(() => useLesson(defaultOptions));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the fetch
      await act(async () => {
        resolvePromise!({ lesson: createMockLesson() });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('auto-generation', () => {
    it('should auto-generate blocks when blocksStatus is pending', async () => {
      const pendingLesson = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'pending',
        blocks: [],
      });

      const generatedBlocks = [
        createMockBlock({ id: 'b1', order: 0 }),
        createMockBlock({ id: 'b2', order: 1 }),
      ];

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: pendingLesson,
      });
      (lessonsApi.generateBlocks as jest.Mock).mockResolvedValue({
        blocks: generatedBlocks,
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: true })
      );

      await waitFor(() => {
        expect(lessonsApi.generateBlocks).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.lesson?.blocks).toHaveLength(2);
      });
    });

    it('should not auto-generate when autoGenerate is false', async () => {
      const pendingLesson = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'pending',
        blocks: [],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: pendingLesson,
      });

      renderHook(() => useLesson({ ...defaultOptions, autoGenerate: false }));

      // Wait a bit to ensure no auto-generation happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(lessonsApi.generateBlocks).not.toHaveBeenCalled();
    });

    it('should auto-generate block content when contentStatus is pending', async () => {
      const lessonWithPendingContent = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'ready',
        blocks: [createMockBlock({ id: 'b1', contentStatus: 'pending' })],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithPendingContent,
      });
      (lessonsApi.generateBlockContent as jest.Mock).mockResolvedValue({
        content: { text: { markdown: 'Generated content' } },
      });

      renderHook(() => useLesson({ ...defaultOptions, autoGenerate: true }));

      await waitFor(() => {
        expect(lessonsApi.generateBlockContent).toHaveBeenCalledWith(
          'course-1',
          'section-1',
          'lesson-1',
          'b1'
        );
      });
    });
  });

  describe('navigation', () => {
    beforeEach(async () => {
      const lessonWithBlocks = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'ready',
        blocks: [
          createMockBlock({ id: 'b1', order: 0 }),
          createMockBlock({ id: 'b2', order: 1 }),
          createMockBlock({ id: 'b3', order: 2 }),
        ],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlocks,
      });
    });

    it('should navigate to next block', async () => {
      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      expect(result.current.currentBlockIndex).toBe(0);

      act(() => {
        result.current.nextBlock();
      });

      expect(result.current.currentBlockIndex).toBe(1);
    });

    it('should navigate to previous block', async () => {
      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      // Move to block 2
      act(() => {
        result.current.nextBlock();
        result.current.nextBlock();
      });

      expect(result.current.currentBlockIndex).toBe(2);

      act(() => {
        result.current.previousBlock();
      });

      expect(result.current.currentBlockIndex).toBe(1);
    });

    it('should go to specific block by ID', async () => {
      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      act(() => {
        result.current.goToBlock('b3');
      });

      expect(result.current.currentBlockIndex).toBe(2);
      expect(result.current.currentBlock?.id).toBe('b3');
    });

    it('should return correct totalBlocks count', async () => {
      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.totalBlocks).toBe(3);
      });
    });
  });

  describe('block interaction', () => {
    it('should start block and track it', async () => {
      const mockBlock = createMockBlock({ id: 'b1' });
      const lessonWithBlock = createMockLesson({
        id: 'lesson-1',
        blocks: [mockBlock],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlock,
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      act(() => {
        result.current.startBlock(mockBlock);
      });

      // Check that store's activeBlock is set
      expect(useLessonStore.getState().activeBlock).not.toBeNull();
      expect(useLessonStore.getState().activeBlock?.block.id).toBe('b1');
    });

    it('should submit answer', async () => {
      const mockBlock = createMockBlock({ id: 'b1', type: 'question' });
      const lessonWithBlock = createMockLesson({
        id: 'lesson-1',
        blocks: [mockBlock],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlock,
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      act(() => {
        result.current.startBlock(mockBlock);
      });

      act(() => {
        result.current.submitAnswer('my answer');
      });

      expect(useLessonStore.getState().activeBlock?.answer).toBe('my answer');
    });

    it('should complete current block', async () => {
      const mockBlock = createMockBlock({ id: 'b1' });
      const lessonWithBlock = createMockLesson({
        id: 'lesson-1',
        blocks: [mockBlock],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlock,
      });
      (lessonsApi.completeBlock as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      act(() => {
        result.current.startBlock(mockBlock);
      });

      await act(async () => {
        await result.current.completeCurrentBlock();
      });

      expect(lessonsApi.completeBlock).toHaveBeenCalledWith(
        'course-1',
        'section-1',
        'lesson-1',
        'b1',
        expect.objectContaining({ timeSpent: expect.any(Number) })
      );
    });
  });

  describe('progress tracking', () => {
    it('should track completed blocks count', async () => {
      const lessonWithBlocks = createMockLesson({
        id: 'lesson-1',
        blocks: [
          createMockBlock({ id: 'b1' }),
          createMockBlock({ id: 'b2' }),
        ],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlocks,
      });
      (lessonsApi.completeBlock as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      expect(result.current.completedBlocksCount).toBe(0);

      // Complete first block
      act(() => {
        result.current.startBlock(result.current.currentBlock!);
      });

      await act(async () => {
        await result.current.completeCurrentBlock();
      });

      expect(result.current.completedBlocksCount).toBe(1);
    });

    it('should detect lesson completion', async () => {
      const lessonWithBlocks = createMockLesson({
        id: 'lesson-1',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlocks,
      });
      (lessonsApi.completeBlock as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      expect(result.current.isLessonComplete).toBe(false);

      // Complete the only block
      act(() => {
        result.current.startBlock(result.current.currentBlock!);
      });

      await act(async () => {
        await result.current.completeCurrentBlock();
      });

      expect(result.current.isLessonComplete).toBe(true);
    });
  });

  describe('lesson completion flow', () => {
    it('should update lesson status and get next lesson on finish', async () => {
      const mockCourse = createMockCourse();
      const lessonWithBlocks = createMockLesson({
        id: 'lesson-1',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      // Set up courses store with the course
      act(() => {
        useCoursesStore.getState().setCourses([mockCourse]);
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlocks,
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      let nextPosition;
      await act(async () => {
        nextPosition = await result.current.finishLesson();
      });

      // Should return the next lesson position
      expect(nextPosition).toEqual({
        sectionId: 'section-1',
        lessonId: 'lesson-2',
        sectionIndex: 0,
        lessonIndex: 1,
      });
    });

    it('should return null when no more lessons', async () => {
      // Course with only one lesson
      const singleLessonCourse = createMockCourse({
        outline: {
          title: 'Single Lesson Course',
          description: 'A course with one lesson',
          emoji: '📚',
          estimatedMinutes: 30,
          difficulty: 'beginner',
          category: 'test',
          prerequisites: [],
          learningOutcomes: [],
          generatedAt: Date.now(),
          sections: [
            {
              id: 'section-1',
              title: 'Section 1',
              description: 'Section 1 description',
              estimatedMinutes: 30,
              learningOutcomes: [],
              status: 'pending',
              lessons: [
                { id: 'lesson-1', title: 'Only Lesson', description: 'Only lesson desc', estimatedMinutes: 30, status: 'pending', blocksStatus: 'pending' as ContentStatus },
              ],
            },
          ],
        },
      });

      act(() => {
        useCoursesStore.getState().setCourses([singleLessonCourse]);
      });

      const lessonWithBlocks = createMockLesson({ id: 'lesson-1' });
      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithBlocks,
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      let nextPosition;
      await act(async () => {
        nextPosition = await result.current.finishLesson();
      });

      expect(nextPosition).toBeNull();
    });
  });

  describe('generation methods', () => {
    it('should manually generate blocks via generateBlocksIfNeeded', async () => {
      const pendingLesson = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'pending',
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: pendingLesson,
      });
      (lessonsApi.generateBlocks as jest.Mock).mockResolvedValue({
        blocks: [createMockBlock()],
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      // Manually trigger generation
      await act(async () => {
        await result.current.generateBlocksIfNeeded();
      });

      expect(lessonsApi.generateBlocks).toHaveBeenCalled();
    });

    it('should manually generate content via generateCurrentBlockContent', async () => {
      const lessonWithPending = createMockLesson({
        id: 'lesson-1',
        blocksStatus: 'ready',
        blocks: [createMockBlock({ id: 'b1', contentStatus: 'pending' })],
      });

      (lessonsApi.getLesson as jest.Mock).mockResolvedValue({
        lesson: lessonWithPending,
      });
      (lessonsApi.generateBlockContent as jest.Mock).mockResolvedValue({
        content: { text: { markdown: 'Content' } },
      });

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.lesson).not.toBeNull();
      });

      // Manually trigger content generation
      await act(async () => {
        await result.current.generateCurrentBlockContent();
      });

      expect(lessonsApi.generateBlockContent).toHaveBeenCalledWith(
        'course-1',
        'section-1',
        'lesson-1',
        'b1'
      );
    });
  });

  describe('error handling', () => {
    it('should expose error from store', async () => {
      (lessonsApi.getLesson as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useLesson({ ...defaultOptions, autoGenerate: false })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });
});
