/**
 * Flashcard Tool
 *
 * Quick recall card with spaced repetition confidence rating.
 */

import { LearningTool, JSONSchema } from '../types';
import { FlashcardRenderer } from './FlashcardRenderer';
import { FlashcardData, isFlashcardData } from './types';
import flashcardSchema from '../schemas/flashcard.schema.json';

export const FlashcardTool: LearningTool<FlashcardData> = {
  metadata: {
    id: 'flashcard',
    name: 'Flashcard',
    icon: '🃏',
    description: 'Quick recall with flip card and self-assessment',
    badgeColor: 'badge.flashcard',
    embeddable: true,
    targetMinutes: 1,
  },

  schema: flashcardSchema as JSONSchema,

  Renderer: FlashcardRenderer,

  extractData: (step) => ({
    front: step.question || '',
    back: step.expectedAnswer || step.content || '',
    hint: step.hints?.[0],
    topic: step.topic,
    title: step.title,
  }),

  validate: isFlashcardData,
};

export { FlashcardRenderer } from './FlashcardRenderer';
export { FlashcardData, isFlashcardData } from './types';
export default FlashcardTool;
