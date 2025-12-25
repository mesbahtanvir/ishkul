import { create } from 'zustand';
import {
  Lesson,
  Block,
  BlockContent,
  LessonProgress,
  BlockResult,
  ContentStatus,
  LessonPosition,
} from '../types/app';
import { lessonsApi } from '../services/api';

/**
 * State for a single block being viewed/interacted with
 */
interface ActiveBlockState {
  block: Block;
  startedAt: number;
  answer?: string | string[]; // User's answer for questions
}

/**
 * Lesson store state
 */
interface LessonState {
  // Current lesson data
  currentLesson: Lesson | null;
  currentCourseId: string | null;
  currentSectionId: string | null;

  // Block navigation
  currentBlockIndex: number;
  activeBlock: ActiveBlockState | null;

  // Loading states
  lessonLoading: boolean;
  blocksGenerating: boolean;
  blockContentGenerating: string | null; // blockId being generated
  completing: boolean;

  // Error state
  error: string | null;

  // Progress tracking (local, synced to server periodically)
  localProgress: LessonProgress | null;

  // Actions - Lesson
  setCurrentLesson: (lesson: Lesson | null, courseId?: string, sectionId?: string) => void;
  fetchLesson: (courseId: string, lessonId: string, sectionId: string) => Promise<Lesson | null>;
  refreshLesson: (courseId: string, lessonId: string, sectionId: string) => Promise<Lesson | null>;
  clearLesson: () => void;

  // Actions - Block Generation
  generateBlocks: (courseId: string, sectionId: string, lessonId: string) => Promise<Block[] | null>;
  generateBlockContent: (courseId: string, sectionId: string, lessonId: string, blockId: string) => Promise<BlockContent | null>;
  generateAllBlockContent: (courseId: string, sectionId: string, lessonId: string) => Promise<void>;

  // Actions - Block Navigation
  setCurrentBlockIndex: (index: number) => void;
  nextBlock: () => void;
  previousBlock: () => void;
  goToBlock: (blockId: string) => void;

  // Actions - Block Interaction
  setActiveBlock: (block: Block | null) => void;
  setBlockAnswer: (answer: string | string[]) => void;
  completeBlock: (courseId: string, sectionId: string, lessonId: string, blockId: string, result?: BlockResult) => Promise<void>;

  // Actions - Progress
  updateLocalProgress: (updates: Partial<LessonProgress>) => void;
  syncProgress: (courseId: string, sectionId: string, lessonId: string) => Promise<void>;

  // Actions - Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getCurrentBlock: () => Block | null;
  getBlockByIndex: (index: number) => Block | null;
  getNextPendingBlock: () => Block | null;
  isLessonComplete: () => boolean;
  getLessonScore: () => number;
}

/**
 * Calculate lesson score from block results
 */
const calculateScore = (blocks: Block[]): number => {
  const scoredBlocks = blocks.filter(
    (b) => b.type === 'question' || b.type === 'task'
  );
  if (scoredBlocks.length === 0) return 100;

  const completedScored = scoredBlocks.filter(
    (b) => b.contentStatus === 'ready' && b.content
  );
  if (completedScored.length === 0) return 0;

  // For now, return percentage of completed scored blocks
  // In future, could weight by individual scores
  return Math.round((completedScored.length / scoredBlocks.length) * 100);
};

export const useLessonStore = create<LessonState>((set, get) => ({
  // Initial state
  currentLesson: null,
  currentCourseId: null,
  currentSectionId: null,
  currentBlockIndex: 0,
  activeBlock: null,
  lessonLoading: false,
  blocksGenerating: false,
  blockContentGenerating: null,
  completing: false,
  error: null,
  localProgress: null,

  // Lesson actions
  setCurrentLesson: (lesson, courseId, sectionId) => {
    set({
      currentLesson: lesson,
      currentCourseId: courseId ?? get().currentCourseId,
      currentSectionId: sectionId ?? get().currentSectionId,
      currentBlockIndex: 0,
      activeBlock: null,
      error: null,
      localProgress: lesson?.progress ?? null,
    });
  },

  fetchLesson: async (courseId, lessonId, sectionId) => {
    set({ lessonLoading: true, error: null });
    try {
      const response = await lessonsApi.getLesson(courseId, sectionId, lessonId);
      const lesson = response.lesson;
      set({
        currentLesson: lesson,
        currentCourseId: courseId,
        currentSectionId: sectionId,
        currentBlockIndex: 0,
        activeBlock: null,
        lessonLoading: false,
        localProgress: lesson.progress ?? null,
      });
      return lesson;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lesson';
      set({ error: message, lessonLoading: false });
      return null;
    }
  },

  // Refresh lesson data without resetting navigation state (for polling)
  refreshLesson: async (courseId, lessonId, sectionId) => {
    try {
      const response = await lessonsApi.getLesson(courseId, sectionId, lessonId);
      const lesson = response.lesson;
      const { currentLesson, currentBlockIndex, blockContentGenerating } = get();

      // Only update if this is still the current lesson
      if (currentLesson?.id !== lessonId) {
        return null;
      }

      // Check if any previously-generating blocks are now ready
      const previousGeneratingBlockId = blockContentGenerating;
      let newBlockContentGenerating = blockContentGenerating;

      if (previousGeneratingBlockId && lesson.blocks) {
        const block = lesson.blocks.find((b) => b.id === previousGeneratingBlockId);
        if (block && block.contentStatus === 'ready') {
          // Content is now ready - clear the generating flag
          newBlockContentGenerating = null;
        }
      }

      // Merge: update lesson data but preserve navigation state
      set({
        currentLesson: lesson,
        currentCourseId: courseId,
        currentSectionId: sectionId,
        // Preserve current block index unless it's out of bounds
        currentBlockIndex: lesson.blocks
          ? Math.min(currentBlockIndex, lesson.blocks.length - 1)
          : 0,
        blockContentGenerating: newBlockContentGenerating,
        // Clear blocksGenerating if blocks are now ready
        blocksGenerating:
          lesson.blocksStatus === 'generating' ? get().blocksGenerating : false,
        // Preserve local progress (don't overwrite with server progress during active session)
        // localProgress: lesson.progress ?? null,
      });

      return lesson;
    } catch (error) {
      // Don't set error state during refresh - it's background polling
      console.error('Failed to refresh lesson:', error);
      return null;
    }
  },

  clearLesson: () => {
    set({
      currentLesson: null,
      currentCourseId: null,
      currentSectionId: null,
      currentBlockIndex: 0,
      activeBlock: null,
      error: null,
      localProgress: null,
    });
  },

  // Block generation actions
  generateBlocks: async (courseId, sectionId, lessonId) => {
    set({ blocksGenerating: true, error: null });
    try {
      const response = await lessonsApi.generateBlocks(courseId, sectionId, lessonId);
      const { currentLesson } = get();

      // Check if blocks were returned immediately (sync generation)
      if (currentLesson && currentLesson.id === lessonId && response.blocks) {
        set({
          currentLesson: {
            ...currentLesson,
            blocks: response.blocks,
            blocksStatus: 'ready',
          },
          blocksGenerating: false,
        });
        return response.blocks;
      }

      // Check if task is generating (async generation via queue or already in progress)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseAny = response as any;
      if (responseAny.status === 'generating') {
        // Blocks are being generated async - mark as generating
        // The polling effect in useLesson will handle fetching updates
        if (currentLesson && currentLesson.id === lessonId) {
          set({
            currentLesson: {
              ...currentLesson,
              blocksStatus: 'generating',
            },
            // Keep blocksGenerating true to trigger polling
          });
        }
        return null;
      }

      // Content already ready (was cached or previously generated)
      if (responseAny.status === 'ready' && responseAny.blocks) {
        if (currentLesson && currentLesson.id === lessonId) {
          set({
            currentLesson: {
              ...currentLesson,
              blocks: responseAny.blocks,
              blocksStatus: 'ready',
            },
            blocksGenerating: false,
          });
        }
        return responseAny.blocks;
      }

      // Fallback - clear generating state
      set({ blocksGenerating: false });
      return response.blocks ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate blocks';
      set({ error: message, blocksGenerating: false });
      return null;
    }
  },

  generateBlockContent: async (courseId, sectionId, lessonId, blockId) => {
    set({ blockContentGenerating: blockId, error: null });
    try {
      const response = await lessonsApi.generateBlockContent(courseId, sectionId, lessonId, blockId);
      const { currentLesson } = get();

      // Check if content was returned immediately (sync generation)
      if (currentLesson && currentLesson.id === lessonId && response.content) {
        const updatedBlocks = currentLesson.blocks?.map((b) =>
          b.id === blockId
            ? { ...b, content: response.content, contentStatus: 'ready' as ContentStatus }
            : b
        );
        set({
          currentLesson: { ...currentLesson, blocks: updatedBlocks },
          blockContentGenerating: null,
        });
        return response.content;
      }

      // Check if task was queued (async generation via queue)
      // When queued, response contains { status: "generating", message: "..." }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseAny = response as any;
      if (responseAny.status === 'generating') {
        // Task was queued - mark block as generating and keep blockContentGenerating set
        // The polling effect in useLesson will handle fetching updates
        if (currentLesson && currentLesson.id === lessonId) {
          const updatedBlocks = currentLesson.blocks?.map((b) =>
            b.id === blockId ? { ...b, contentStatus: 'generating' as ContentStatus } : b
          );
          set({
            currentLesson: { ...currentLesson, blocks: updatedBlocks },
            // Keep blockContentGenerating set to trigger polling
          });
        }
        return null;
      }

      // Content already ready (was cached or previously generated)
      if (responseAny.status === 'ready' && responseAny.content) {
        if (currentLesson && currentLesson.id === lessonId) {
          const updatedBlocks = currentLesson.blocks?.map((b) =>
            b.id === blockId
              ? { ...b, content: responseAny.content, contentStatus: 'ready' as ContentStatus }
              : b
          );
          set({
            currentLesson: { ...currentLesson, blocks: updatedBlocks },
            blockContentGenerating: null,
          });
        }
        return responseAny.content;
      }

      // Fallback - clear generating state
      set({ blockContentGenerating: null });
      return response.content ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate content';
      // Mark block as error
      const { currentLesson } = get();
      if (currentLesson && currentLesson.id === lessonId) {
        const updatedBlocks = currentLesson.blocks?.map((b) =>
          b.id === blockId ? { ...b, contentStatus: 'error' as ContentStatus } : b
        );
        set({
          currentLesson: { ...currentLesson, blocks: updatedBlocks },
          blockContentGenerating: null,
          error: message,
        });
      }
      return null;
    }
  },

  generateAllBlockContent: async (courseId, sectionId, lessonId) => {
    const { currentLesson } = get();
    if (!currentLesson?.blocks) return;

    const pendingBlocks = currentLesson.blocks.filter(
      (b) => b.contentStatus === 'pending'
    );

    // Generate content for each pending block sequentially
    for (const block of pendingBlocks) {
      await get().generateBlockContent(courseId, sectionId, lessonId, block.id);
    }
  },

  // Block navigation actions
  setCurrentBlockIndex: (index) => {
    const { currentLesson } = get();
    if (!currentLesson?.blocks) return;
    const maxIndex = currentLesson.blocks.length - 1;
    const validIndex = Math.max(0, Math.min(index, maxIndex));
    set({ currentBlockIndex: validIndex });
  },

  nextBlock: () => {
    const { currentBlockIndex, currentLesson } = get();
    if (!currentLesson?.blocks) return;
    if (currentBlockIndex < currentLesson.blocks.length - 1) {
      set({ currentBlockIndex: currentBlockIndex + 1, activeBlock: null });
    }
  },

  previousBlock: () => {
    const { currentBlockIndex } = get();
    if (currentBlockIndex > 0) {
      set({ currentBlockIndex: currentBlockIndex - 1, activeBlock: null });
    }
  },

  goToBlock: (blockId) => {
    const { currentLesson } = get();
    if (!currentLesson?.blocks) return;
    const index = currentLesson.blocks.findIndex((b) => b.id === blockId);
    if (index >= 0) {
      set({ currentBlockIndex: index, activeBlock: null });
    }
  },

  // Block interaction actions
  setActiveBlock: (block) => {
    if (block) {
      set({
        activeBlock: {
          block,
          startedAt: Date.now(),
        },
      });
    } else {
      set({ activeBlock: null });
    }
  },

  setBlockAnswer: (answer) => {
    const { activeBlock } = get();
    if (activeBlock) {
      set({
        activeBlock: { ...activeBlock, answer },
      });
    }
  },

  completeBlock: async (courseId, sectionId, lessonId, blockId, result) => {
    set({ completing: true, error: null });
    try {
      const { activeBlock } = get();
      const timeSpent = activeBlock
        ? Math.round((Date.now() - activeBlock.startedAt) / 1000)
        : 0;

      const requestData = result
        ? { ...result, timeSpent }
        : { timeSpent };

      await lessonsApi.completeBlock(courseId, sectionId, lessonId, blockId, requestData);

      // Update local state
      const { currentLesson, localProgress } = get();
      if (currentLesson && currentLesson.id === lessonId) {
        // Add to completed blocks in local progress
        const updatedProgress: LessonProgress = {
          ...localProgress,
          lessonId,
          completedBlocks: [...(localProgress?.completedBlocks ?? []), blockId],
          lastBlockId: blockId,
          updatedAt: Date.now(),
        };

        set({
          localProgress: updatedProgress,
          completing: false,
          activeBlock: null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete block';
      set({ error: message, completing: false });
    }
  },

  // Progress actions
  updateLocalProgress: (updates) => {
    const { localProgress, currentLesson } = get();
    if (!currentLesson) return;
    set({
      localProgress: {
        ...localProgress,
        lessonId: currentLesson.id,
        ...updates,
        updatedAt: Date.now(),
      },
    });
  },

  syncProgress: async (courseId, sectionId, lessonId) => {
    const { localProgress } = get();
    if (!localProgress) return;

    try {
      await lessonsApi.updateLessonProgress(courseId, sectionId, lessonId, localProgress);
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  },

  // Loading/error actions
  setLoading: (loading) => set({ lessonLoading: loading }),
  setError: (error) => set({ error }),

  // Selectors
  getCurrentBlock: () => {
    const { currentLesson, currentBlockIndex } = get();
    return currentLesson?.blocks?.[currentBlockIndex] ?? null;
  },

  getBlockByIndex: (index) => {
    const { currentLesson } = get();
    return currentLesson?.blocks?.[index] ?? null;
  },

  getNextPendingBlock: () => {
    const { currentLesson, currentBlockIndex } = get();
    if (!currentLesson?.blocks) return null;

    // Look for first pending block after current
    for (let i = currentBlockIndex; i < currentLesson.blocks.length; i++) {
      const block = currentLesson.blocks[i];
      if (block.contentStatus === 'pending') {
        return block;
      }
    }
    return null;
  },

  isLessonComplete: () => {
    const { currentLesson, localProgress } = get();
    // Require at least 1 block to be considered complete (fixes 0 >= 0 bug)
    if (!currentLesson?.blocks || currentLesson.blocks.length === 0) return false;
    const totalBlocks = currentLesson.blocks.length;
    const completedBlocks = localProgress?.completedBlocks?.length ?? 0;
    return completedBlocks >= totalBlocks;
  },

  getLessonScore: () => {
    const { currentLesson } = get();
    if (!currentLesson?.blocks) return 0;
    return calculateScore(currentLesson.blocks);
  },
}));

/**
 * Helper: Get the next lesson position in the course
 */
export const getNextLessonPosition = (
  sections: { id: string; lessons: { id: string }[] }[],
  currentSectionId: string,
  currentLessonId: string
): LessonPosition | null => {
  const sectionIndex = sections.findIndex((s) => s.id === currentSectionId);
  if (sectionIndex === -1) return null;

  const section = sections[sectionIndex];
  const lessonIndex = section.lessons.findIndex((l) => l.id === currentLessonId);
  if (lessonIndex === -1) return null;

  // Check for next lesson in same section
  if (lessonIndex < section.lessons.length - 1) {
    return {
      sectionId: currentSectionId,
      lessonId: section.lessons[lessonIndex + 1].id,
      sectionIndex,
      lessonIndex: lessonIndex + 1,
    };
  }

  // Check for first lesson in next section
  if (sectionIndex < sections.length - 1) {
    const nextSection = sections[sectionIndex + 1];
    if (nextSection.lessons.length > 0) {
      return {
        sectionId: nextSection.id,
        lessonId: nextSection.lessons[0].id,
        sectionIndex: sectionIndex + 1,
        lessonIndex: 0,
      };
    }
  }

  // Course complete
  return null;
};
