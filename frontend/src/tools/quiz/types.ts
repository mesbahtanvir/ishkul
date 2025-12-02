/**
 * Quiz Tool Types
 */

/**
 * Data structure for quiz content
 */
export interface QuizData {
  /** The question to ask */
  question: string;
  /** Expected correct answer */
  expectedAnswer: string;
  /** Multiple choice options (optional) */
  options?: string[];
  /** Explanation shown after answering */
  explanation?: string;
  /** Topic being tested */
  topic: string;
  /** Quiz title */
  title: string;
}

/**
 * Type guard for QuizData
 */
export function isQuizData(data: unknown): data is QuizData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.question === 'string' &&
    typeof obj.expectedAnswer === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.title === 'string' &&
    (obj.options === undefined || Array.isArray(obj.options)) &&
    (obj.explanation === undefined || typeof obj.explanation === 'string')
  );
}
