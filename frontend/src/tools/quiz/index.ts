/**
 * Quiz Tool
 *
 * Quick comprehension check with ONE question (30-60 seconds).
 */

import { LearningTool, JSONSchema } from '../types';
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

  schema: quizSchema as JSONSchema,

  Renderer: QuizRenderer,

  extractData: (block) => {
    const question = block.content?.question?.question;
    return {
      question: question?.text || '',
      expectedAnswer: question?.correctAnswer || '',
      options: question?.options?.map((opt) => opt.text),
      explanation: question?.explanation,
      topic: block.purpose,
      title: block.title,
    };
  },

  validate: isQuizData,
};

export { QuizRenderer } from './QuizRenderer';
export { QuizData, isQuizData } from './types';
export default QuizTool;
