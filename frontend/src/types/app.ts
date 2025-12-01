// Type definitions for the learning app

export type LevelType = 'beginner' | 'intermediate' | 'advanced';
export type StepType = 'lesson' | 'quiz' | 'practice' | 'review' | 'summary';

// Maximum character length for step content
export const MAX_STEP_CONTENT_LENGTH = 2000;

// Number of steps before memory compaction triggers
export const COMPACTION_INTERVAL = 10;

export interface TopicMemory {
  confidence: number;
  lastReviewed: string;
  timesTested: number;
}

export interface Compaction {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  lastStepIndex: number;
  compactedAt: number;
}

export interface Memory {
  topics: {
    [topic: string]: TopicMemory;
  };
  compaction?: Compaction;
}

// Step represents a single step in the learning path (replaces NextStep + HistoryEntry)
export interface Step {
  id: string;
  index: number;
  type: StepType;
  topic: string;
  title: string;
  content?: string; // For lessons (max 2k chars)
  question?: string; // For quizzes
  options?: string[]; // For multiple choice quizzes
  expectedAnswer?: string; // Correct answer for quizzes
  task?: string; // For practice
  hints?: string[]; // For practice
  completed: boolean;
  completedAt?: number;
  userAnswer?: string; // User's answer for quizzes
  score?: number; // Score for quizzes (0-100)
  createdAt: number;
}

// Request to complete a step
export interface StepCompleteRequest {
  userAnswer?: string;
  score?: number;
}

// Legacy types kept for backward compatibility
export interface HistoryEntry {
  type: StepType;
  topic: string;
  score?: number;
  timestamp: number;
}

export interface NextStep {
  type: StepType;
  topic: string;
  title?: string;
  content?: string;
  question?: string;
  expectedAnswer?: string;
  task?: string;
}

// Learning Path - represents a single learning journey
export interface LearningPath {
  id: string;
  goal: string;
  level: LevelType;
  emoji: string;
  progress: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  steps: Step[]; // All steps (completed and current)
  memory: Memory;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
}

export interface UserDocument {
  uid: string;
  email?: string;
  displayName?: string;
  learningPaths: LearningPath[];
  // Legacy fields for backward compatibility (will be migrated)
  goal?: string;
  level?: LevelType;
  memory?: Memory;
  history?: HistoryEntry[];
  nextStep?: NextStep;
  createdAt: number;
  updatedAt: number;
}

export interface LLMRequest {
  goal: string;
  level: LevelType;
  memory: Memory;
  history: HistoryEntry[];
}

export interface LLMResponse {
  nextStep: NextStep;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
