/**
 * Learning Tools
 *
 * Central export for all learning tools and the registry.
 * Import this file to auto-register all built-in tools.
 */

// Core types and registry
export * from './types';
export * from './registry';

// Individual tools
export { LessonTool, LessonRenderer, LessonData } from './lesson';
export { QuizTool, QuizRenderer, QuizData } from './quiz';
export { PracticeTool, PracticeRenderer, PracticeData } from './practice';

// Register all built-in tools
import { registerTool } from './registry';
import { LessonTool } from './lesson';
import { QuizTool } from './quiz';
import { PracticeTool } from './practice';

/**
 * Initialize and register all built-in tools
 */
export function initializeTools(): void {
  registerTool(LessonTool);
  registerTool(QuizTool);
  registerTool(PracticeTool);

  // Review and Summary use the same renderer as Lesson
  // They're registered as aliases
  registerTool({
    ...LessonTool,
    metadata: {
      ...LessonTool.metadata,
      id: 'review',
      name: 'Review',
      icon: '🔄',
      description: 'Quick refresh of ONE previously learned concept',
      targetMinutes: 2,
    },
  });

  registerTool({
    ...LessonTool,
    metadata: {
      ...LessonTool.metadata,
      id: 'summary',
      name: 'Summary',
      icon: '📋',
      description: 'Connect 2-3 recent concepts in a structured format',
      targetMinutes: 2,
    },
  });
}

// Auto-initialize on import
initializeTools();
