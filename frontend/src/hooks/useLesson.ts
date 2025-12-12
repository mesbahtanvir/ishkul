import { useCallback, useEffect, useRef } from 'react';
import { useLessonStore } from '../state/lessonStore';
import { useCoursesStore } from '../state/coursesStore';
import { Block, BlockResult, LessonPosition } from '../types/app';

interface UseLessonOptions {
  courseId: string;
  lessonId: string;
  sectionId: string;
  autoGenerate?: boolean; // Auto-generate blocks if pending (default: true)
  initialLesson?: ReturnType<typeof useLessonStore.getState>['currentLesson']; // Optional pre-populated lesson
}

interface UseLessonReturn {
  // Lesson state
  lesson: ReturnType<typeof useLessonStore.getState>['currentLesson'];
  currentBlock: Block | null;
  currentBlockIndex: number;
  totalBlocks: number;

  // Loading states
  isLoading: boolean;
  isGeneratingBlocks: boolean;
  isGeneratingContent: string | null;
  isCompleting: boolean;

  // Error state
  error: string | null;

  // Progress
  completedBlocksCount: number;
  isLessonComplete: boolean;
  score: number;

  // Navigation
  nextBlock: () => void;
  previousBlock: () => void;
  goToBlock: (blockId: string) => void;

  // Block interaction
  startBlock: (block: Block) => void;
  submitAnswer: (answer: string | string[]) => void;
  completeCurrentBlock: (result?: BlockResult) => Promise<void>;

  // Generation
  generateBlocksIfNeeded: () => Promise<void>;
  generateCurrentBlockContent: () => Promise<void>;

  // Lesson completion
  finishLesson: () => Promise<LessonPosition | null>;
}

/**
 * Custom hook for managing lesson flow
 * Handles auto-generation, block progression, and completion
 */
export function useLesson({
  courseId,
  lessonId,
  sectionId,
  autoGenerate = true,
  initialLesson,
}: UseLessonOptions): UseLessonReturn {
  // Track previous lessonId to detect navigation between lessons
  const prevLessonIdRef = useRef<string | null>(null);

  // Lesson store
  const {
    currentLesson,
    currentBlockIndex,
    lessonLoading,
    blocksGenerating,
    blockContentGenerating,
    completing,
    error,
    localProgress,
    setCurrentLesson,
    fetchLesson,
    clearLesson,
    generateBlocks,
    generateBlockContent,
    nextBlock: storeNextBlock,
    previousBlock: storePreviousBlock,
    goToBlock: storeGoToBlock,
    setActiveBlock,
    setBlockAnswer,
    completeBlock,
    isLessonComplete,
    getLessonScore,
    getCurrentBlock,
  } = useLessonStore();

  // Courses store for navigation
  const { getNextLesson, updateLessonStatus, setCoursePosition } = useCoursesStore();

  // Initialize lesson on mount OR when lessonId changes (navigation between lessons)
  useEffect(() => {
    const isNewLesson = prevLessonIdRef.current !== lessonId;

    if (isNewLesson) {
      // Clear stale state from previous lesson before loading new one
      if (prevLessonIdRef.current !== null) {
        clearLesson();
      }

      prevLessonIdRef.current = lessonId;

      // If initialLesson provided, use it immediately while fetching fresh data
      if (initialLesson) {
        setCurrentLesson(initialLesson, courseId, sectionId);
      }

      // Always fetch fresh lesson data from API
      fetchLesson(courseId, lessonId, sectionId);
    }
  }, [courseId, lessonId, sectionId, fetchLesson, clearLesson, initialLesson, setCurrentLesson]);

  // Auto-generate blocks if needed
  useEffect(() => {
    if (
      autoGenerate &&
      currentLesson &&
      currentLesson.blocksStatus === 'pending' &&
      !blocksGenerating
    ) {
      generateBlocks(courseId, sectionId, lessonId);
    }
  }, [autoGenerate, currentLesson, blocksGenerating, courseId, sectionId, lessonId, generateBlocks]);

  // Get current block
  const currentBlock = getCurrentBlock();
  const totalBlocks = currentLesson?.blocks?.length ?? 0;
  const completedBlocksCount = localProgress?.completedBlocks?.length ?? 0;

  // Generate blocks if needed
  const generateBlocksIfNeeded = useCallback(async () => {
    if (currentLesson?.blocksStatus === 'pending') {
      await generateBlocks(courseId, sectionId, lessonId);
    }
  }, [currentLesson, courseId, sectionId, lessonId, generateBlocks]);

  // Generate content for current block
  const generateCurrentBlockContent = useCallback(async () => {
    if (currentBlock && currentBlock.contentStatus === 'pending') {
      await generateBlockContent(courseId, sectionId, lessonId, currentBlock.id);
    }
  }, [currentBlock, courseId, sectionId, lessonId, generateBlockContent]);

  // Auto-generate content for current block if pending
  useEffect(() => {
    if (
      autoGenerate &&
      currentBlock &&
      currentBlock.contentStatus === 'pending' &&
      !blockContentGenerating
    ) {
      generateBlockContent(courseId, sectionId, lessonId, currentBlock.id);
    }
  }, [autoGenerate, currentBlock, blockContentGenerating, courseId, sectionId, lessonId, generateBlockContent]);

  // Start interacting with a block
  const startBlock = useCallback(
    (block: Block) => {
      setActiveBlock(block);
    },
    [setActiveBlock]
  );

  // Submit answer for current block
  const submitAnswer = useCallback(
    (answer: string | string[]) => {
      setBlockAnswer(answer);
    },
    [setBlockAnswer]
  );

  // Complete current block
  const completeCurrentBlock = useCallback(
    async (result?: BlockResult) => {
      if (!currentBlock) return;
      await completeBlock(courseId, sectionId, lessonId, currentBlock.id, result);
    },
    [currentBlock, courseId, sectionId, lessonId, completeBlock]
  );

  // Navigation
  const nextBlock = useCallback(() => {
    storeNextBlock();
  }, [storeNextBlock]);

  const previousBlock = useCallback(() => {
    storePreviousBlock();
  }, [storePreviousBlock]);

  const goToBlock = useCallback(
    (blockId: string) => {
      storeGoToBlock(blockId);
    },
    [storeGoToBlock]
  );

  // Finish lesson and get next lesson position
  const finishLesson = useCallback(async (): Promise<LessonPosition | null> => {
    // Update lesson status to completed
    updateLessonStatus(courseId, sectionId, lessonId, 'completed');

    // Get next lesson
    const nextPosition = getNextLesson(courseId, sectionId, lessonId);

    if (nextPosition) {
      // Update course position
      setCoursePosition(courseId, nextPosition);
    }

    return nextPosition;
  }, [courseId, sectionId, lessonId, updateLessonStatus, getNextLesson, setCoursePosition]);

  return {
    // Lesson state
    lesson: currentLesson,
    currentBlock,
    currentBlockIndex,
    totalBlocks,

    // Loading states
    isLoading: lessonLoading,
    isGeneratingBlocks: blocksGenerating,
    isGeneratingContent: blockContentGenerating,
    isCompleting: completing,

    // Error state
    error,

    // Progress
    completedBlocksCount,
    isLessonComplete: isLessonComplete(),
    score: getLessonScore(),

    // Navigation
    nextBlock,
    previousBlock,
    goToBlock,

    // Block interaction
    startBlock,
    submitAnswer,
    completeCurrentBlock,

    // Generation
    generateBlocksIfNeeded,
    generateCurrentBlockContent,

    // Lesson completion
    finishLesson,
  };
}
