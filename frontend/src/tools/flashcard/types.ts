/**
 * Flashcard Tool Types
 */

/**
 * Data structure for flashcard content
 */
export interface FlashcardData {
  /** Question, term, or prompt shown first */
  front: string;
  /** Answer, definition, or explanation */
  back: string;
  /** Optional hint before revealing answer */
  hint?: string;
  /** Topic being tested */
  topic: string;
  /** Flashcard title */
  title: string;
}

/**
 * Confidence levels for spaced repetition
 */
export type ConfidenceLevel = 'again' | 'hard' | 'good' | 'easy';

/**
 * Score mapping for confidence levels
 */
export const confidenceScores: Record<ConfidenceLevel, number> = {
  again: 20,
  hard: 50,
  good: 80,
  easy: 100,
};

/**
 * Type guard for FlashcardData
 */
export function isFlashcardData(data: unknown): data is FlashcardData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.front === 'string' &&
    typeof obj.back === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.title === 'string' &&
    (obj.hint === undefined || typeof obj.hint === 'string')
  );
}
