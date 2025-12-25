/**
 * Lesson Tool
 *
 * Micro-lesson that teaches ONE concept in 2-3 minutes.
 */

import { LearningTool, JSONSchema } from '../types';
import { LessonRenderer } from './LessonRenderer';
import { LessonData, isLessonData } from './types';
import lessonSchema from '../schemas/lesson.schema.json';

export const LessonTool: LearningTool<LessonData> = {
  metadata: {
    id: 'lesson',
    name: 'Lesson',
    icon: '📖',
    description: 'Teach ONE micro-concept with a clear example and takeaway',
    badgeColor: 'badge.lesson',
    embeddable: false,
    targetMinutes: 3,
  },

  schema: lessonSchema as JSONSchema,

  Renderer: LessonRenderer,

  extractData: (block) => {
    const text = block.content?.text;
    return {
      content: text?.markdown || '',
      topic: block.purpose,
      title: block.title,
    };
  },

  validate: isLessonData,
};

export { LessonRenderer } from './LessonRenderer';
export { LessonData, isLessonData } from './types';
export default LessonTool;
