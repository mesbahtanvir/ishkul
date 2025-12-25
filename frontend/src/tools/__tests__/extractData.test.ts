/**
 * Tests for tool extractData functions
 *
 * Tests extraction of data from Block content for each tool type
 */

import { QuizTool } from '../quiz';
import { FlashcardTool } from '../flashcard';
import { LessonTool } from '../lesson';
import { PracticeTool } from '../practice';
import { Block } from '../../types/app';

// Helper to create a base block
const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
  id: 'block-123',
  type: 'text',
  order: 0,
  title: 'Test Block',
  purpose: 'test-purpose',
  contentStatus: 'ready',
  ...overrides,
});

describe('Tool extractData functions', () => {
  describe('QuizTool.extractData', () => {
    it('should extract quiz data from block content', () => {
      const block = createMockBlock({
        type: 'question',
        title: 'Quiz Question',
        purpose: 'test comprehension',
        content: {
          question: {
            question: {
              id: 'q1',
              type: 'multiple_choice',
              text: 'What is 2 + 2?',
              correctAnswer: '4',
              options: [
                { id: 'opt1', text: '3' },
                { id: 'opt2', text: '4' },
                { id: 'opt3', text: '5' },
              ],
              explanation: 'Basic arithmetic',
            },
          },
        },
      });

      const data = QuizTool.extractData(block);

      expect(data.question).toBe('What is 2 + 2?');
      expect(data.expectedAnswer).toBe('4');
      expect(data.options).toEqual(['3', '4', '5']);
      expect(data.explanation).toBe('Basic arithmetic');
      expect(data.topic).toBe('test comprehension');
      expect(data.title).toBe('Quiz Question');
    });

    it('should handle missing content gracefully', () => {
      const block = createMockBlock({
        type: 'question',
        title: 'Empty Quiz',
        purpose: 'testing',
        content: {},
      });

      const data = QuizTool.extractData(block);

      expect(data.question).toBe('');
      expect(data.expectedAnswer).toBe('');
      expect(data.options).toBeUndefined();
      expect(data.explanation).toBeUndefined();
    });

    it('should handle null content', () => {
      const block = createMockBlock({
        type: 'question',
        content: undefined,
      });

      const data = QuizTool.extractData(block);

      expect(data.question).toBe('');
      expect(data.expectedAnswer).toBe('');
    });

    it('should handle missing options', () => {
      const block = createMockBlock({
        type: 'question',
        content: {
          question: {
            question: {
              id: 'q1',
              type: 'short_answer',
              text: 'Open-ended question?',
              correctAnswer: 'Any valid answer',
            },
          },
        },
      });

      const data = QuizTool.extractData(block);

      expect(data.question).toBe('Open-ended question?');
      expect(data.options).toBeUndefined();
    });
  });

  describe('FlashcardTool.extractData', () => {
    it('should extract flashcard data from block content', () => {
      const block = createMockBlock({
        type: 'flashcard',
        title: 'Vocabulary Card',
        purpose: 'vocabulary',
        content: {
          flashcard: {
            front: 'Hello',
            back: 'Hola',
            hint: 'Common greeting',
          },
        },
      });

      const data = FlashcardTool.extractData(block);

      expect(data.front).toBe('Hello');
      expect(data.back).toBe('Hola');
      expect(data.hint).toBe('Common greeting');
      expect(data.topic).toBe('vocabulary');
      expect(data.title).toBe('Vocabulary Card');
    });

    it('should handle missing content gracefully', () => {
      const block = createMockBlock({
        type: 'flashcard',
        content: {},
      });

      const data = FlashcardTool.extractData(block);

      expect(data.front).toBe('');
      expect(data.back).toBe('');
      expect(data.hint).toBeUndefined();
    });

    it('should handle missing hint', () => {
      const block = createMockBlock({
        type: 'flashcard',
        content: {
          flashcard: {
            front: 'Question',
            back: 'Answer',
          },
        },
      });

      const data = FlashcardTool.extractData(block);

      expect(data.front).toBe('Question');
      expect(data.back).toBe('Answer');
      expect(data.hint).toBeUndefined();
    });
  });

  describe('LessonTool.extractData', () => {
    it('should extract lesson data from block content', () => {
      const block = createMockBlock({
        type: 'text',
        title: 'Introduction to React',
        purpose: 'fundamentals',
        content: {
          text: {
            markdown: '# React Basics\n\nReact is a JavaScript library...',
          },
        },
      });

      const data = LessonTool.extractData(block);

      expect(data.content).toBe('# React Basics\n\nReact is a JavaScript library...');
      expect(data.topic).toBe('fundamentals');
      expect(data.title).toBe('Introduction to React');
    });

    it('should handle missing content gracefully', () => {
      const block = createMockBlock({
        type: 'text',
        content: {},
      });

      const data = LessonTool.extractData(block);

      expect(data.content).toBe('');
    });

    it('should handle undefined text content', () => {
      const block = createMockBlock({
        type: 'text',
        content: {
          text: undefined,
        },
      });

      const data = LessonTool.extractData(block);

      expect(data.content).toBe('');
    });
  });

  describe('PracticeTool.extractData', () => {
    it('should extract practice data from block content', () => {
      const block = createMockBlock({
        type: 'task',
        title: 'Build a Button',
        purpose: 'hands-on practice',
        content: {
          task: {
            instruction: 'Create a reusable button component',
            hints: ['Use props for customization', 'Consider accessibility'],
          },
        },
      });

      const data = PracticeTool.extractData(block);

      expect(data.task).toBe('Create a reusable button component');
      expect(data.hints).toEqual(['Use props for customization', 'Consider accessibility']);
      expect(data.topic).toBe('hands-on practice');
      expect(data.title).toBe('Build a Button');
    });

    it('should handle missing content gracefully', () => {
      const block = createMockBlock({
        type: 'task',
        content: {},
      });

      const data = PracticeTool.extractData(block);

      expect(data.task).toBe('');
      expect(data.hints).toBeUndefined();
    });

    it('should handle missing hints', () => {
      const block = createMockBlock({
        type: 'task',
        content: {
          task: {
            instruction: 'Write a test',
          },
        },
      });

      const data = PracticeTool.extractData(block);

      expect(data.task).toBe('Write a test');
      expect(data.hints).toBeUndefined();
    });

    it('should handle empty hints array', () => {
      const block = createMockBlock({
        type: 'task',
        content: {
          task: {
            instruction: 'Complete the task',
            hints: [],
          },
        },
      });

      const data = PracticeTool.extractData(block);

      expect(data.hints).toEqual([]);
    });
  });

  describe('Tool metadata', () => {
    it('QuizTool should have correct metadata', () => {
      expect(QuizTool.metadata.id).toBe('quiz');
      expect(QuizTool.metadata.name).toBe('Quiz');
      expect(QuizTool.metadata.embeddable).toBe(true);
      expect(QuizTool.metadata.targetMinutes).toBe(1);
    });

    it('FlashcardTool should have correct metadata', () => {
      expect(FlashcardTool.metadata.id).toBe('flashcard');
      expect(FlashcardTool.metadata.name).toBe('Flashcard');
      expect(FlashcardTool.metadata.embeddable).toBe(true);
      expect(FlashcardTool.metadata.targetMinutes).toBe(1);
    });

    it('LessonTool should have correct metadata', () => {
      expect(LessonTool.metadata.id).toBe('lesson');
      expect(LessonTool.metadata.name).toBe('Lesson');
      expect(LessonTool.metadata.embeddable).toBe(false);
      expect(LessonTool.metadata.targetMinutes).toBe(3);
    });

    it('PracticeTool should have correct metadata', () => {
      expect(PracticeTool.metadata.id).toBe('practice');
      expect(PracticeTool.metadata.name).toBe('Practice');
      expect(PracticeTool.metadata.embeddable).toBe(false);
      expect(PracticeTool.metadata.targetMinutes).toBe(5);
    });
  });
});
