/**
 * Lesson Tool Types
 */

/**
 * Data structure for lesson content
 */
export interface LessonData {
  /** Markdown-formatted lesson content */
  content: string;
  /** Topic being taught */
  topic: string;
  /** Lesson title */
  title: string;
}

/**
 * Type guard for LessonData
 */
export function isLessonData(data: unknown): data is LessonData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.content === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.title === 'string'
  );
}
