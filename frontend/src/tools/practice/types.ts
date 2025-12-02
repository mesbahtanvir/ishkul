/**
 * Practice Tool Types
 */

/**
 * Data structure for practice content
 */
export interface PracticeData {
  /** The task description */
  task: string;
  /** Hints if stuck */
  hints?: string[];
  /** Success criteria */
  successCriteria?: string[];
  /** Estimated time */
  estimatedTime?: string;
  /** Topic being practiced */
  topic: string;
  /** Practice title */
  title: string;
}

/**
 * Type guard for PracticeData
 */
export function isPracticeData(data: unknown): data is PracticeData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.task === 'string' &&
    typeof obj.topic === 'string' &&
    typeof obj.title === 'string' &&
    (obj.hints === undefined || Array.isArray(obj.hints)) &&
    (obj.successCriteria === undefined || Array.isArray(obj.successCriteria)) &&
    (obj.estimatedTime === undefined || typeof obj.estimatedTime === 'string')
  );
}
