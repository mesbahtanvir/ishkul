/**
 * Practice Tool
 *
 * Small, focused exercise completable in 3-5 minutes.
 */

import { LearningTool, JSONSchema } from '../types';
import { PracticeRenderer } from './PracticeRenderer';
import { PracticeData, isPracticeData } from './types';
import practiceSchema from '../schemas/practice.schema.json';

export const PracticeTool: LearningTool<PracticeData> = {
  metadata: {
    id: 'practice',
    name: 'Practice',
    icon: '💪',
    description: 'One small, focused exercise with clear success criteria',
    badgeColor: 'badge.practice',
    embeddable: false,
    targetMinutes: 5,
  },

  schema: practiceSchema as JSONSchema,

  Renderer: PracticeRenderer,

  extractData: (block) => {
    const task = block.content?.task;
    return {
      task: task?.instruction || '',
      hints: task?.hints,
      topic: block.purpose,
      title: block.title,
    };
  },

  validate: isPracticeData,
};

export { PracticeRenderer } from './PracticeRenderer';
export { PracticeData, isPracticeData } from './types';
export default PracticeTool;
