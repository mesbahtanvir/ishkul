/**
 * Lesson Tool
 *
 * Micro-lesson that teaches ONE concept in 2-3 minutes.
 */

import { LearningTool } from '../types';
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

  schema: lessonSchema,

  Renderer: LessonRenderer,

  extractData: (step) => ({
    content: step.content || '',
    topic: step.topic,
    title: step.title,
  }),

  validate: isLessonData,
};

export { LessonRenderer } from './LessonRenderer';
export { LessonData, isLessonData } from './types';
export default LessonTool;
