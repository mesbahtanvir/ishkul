import { create } from 'zustand';
import { LessonPosition, Block } from '../types/app';

/**
 * Learning state for the current active lesson session.
 * Tracks the user's position within a lesson and block progress.
 */
interface LearningState {
  // Current lesson being studied
  currentPosition: LessonPosition | null;
  // Current block within the lesson
  currentBlockIndex: number;
  // All blocks for the current lesson
  blocks: Block[];
  // Loading state for lesson content
  loading: boolean;

  // Actions
  setCurrentPosition: (position: LessonPosition | null) => void;
  setCurrentBlockIndex: (index: number) => void;
  setBlocks: (blocks: Block[]) => void;
  nextBlock: () => void;
  previousBlock: () => void;
  setLoading: (loading: boolean) => void;
  clearLesson: () => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  currentPosition: null,
  currentBlockIndex: 0,
  blocks: [],
  loading: false,

  setCurrentPosition: (position) => set({ currentPosition: position }),

  setCurrentBlockIndex: (index) => set({ currentBlockIndex: index }),

  setBlocks: (blocks) => set({ blocks, currentBlockIndex: 0 }),

  nextBlock: () => {
    const { currentBlockIndex, blocks } = get();
    if (currentBlockIndex < blocks.length - 1) {
      set({ currentBlockIndex: currentBlockIndex + 1 });
    }
  },

  previousBlock: () => {
    const { currentBlockIndex } = get();
    if (currentBlockIndex > 0) {
      set({ currentBlockIndex: currentBlockIndex - 1 });
    }
  },

  setLoading: (loading) => set({ loading }),

  clearLesson: () =>
    set({
      currentPosition: null,
      currentBlockIndex: 0,
      blocks: [],
    }),
}));
