/**
 * Quiz Tool
 *
 * Quick comprehension check with ONE question (30-60 seconds).
 */

import { LearningTool } from '../types';
import { QuizRenderer } from './QuizRenderer';
import { QuizData, isQuizData } from './types';
import quizSchema from '../schemas/quiz.schema.json';

export const QuizTool: LearningTool<QuizData> = {
  metadata: {
    id: 'quiz',
    name: 'Quiz',
    icon: '❓',
    description: 'Quick comprehension check with one focused question',
    badgeColor: 'badge.quiz',
    embeddable: true,
    targetMinutes: 1,
  },

  schema: quizSchema,

  Renderer: QuizRenderer,

  extractData: (step) => ({
    question: step.question || '',
    expectedAnswer: step.expectedAnswer || '',
    options: step.options,
    topic: step.topic,
    title: step.title,
  }),

  validate: isQuizData,
};

export { QuizRenderer } from './QuizRenderer';
export { QuizData, isQuizData } from './types';
export default QuizTool;
