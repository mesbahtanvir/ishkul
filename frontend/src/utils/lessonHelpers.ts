/**
 * Helper functions for lesson operations
 * Extracted from lessonStore.ts for reusability
 */

import { Block, LessonPosition } from '../types/app';

/**
 * Calculate lesson score from block results
 */
export const calculateLessonScore = (blocks: Block[]): number => {
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

/**
 * Get the next lesson position in the course
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

/**
 * Check if a lesson is complete based on blocks and progress
 */
export const isLessonCompleted = (
  blocks: Block[] | undefined,
  completedBlockIds: string[] | undefined
): boolean => {
  // Require at least 1 block to be considered complete (fixes 0 >= 0 bug)
  if (!blocks || blocks.length === 0) return false;
  const totalBlocks = blocks.length;
  const completedBlocks = completedBlockIds?.length ?? 0;
  return completedBlocks >= totalBlocks;
};
