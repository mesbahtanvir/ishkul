// Type definitions for the learning app

export type LevelType = 'beginner' | 'intermediate' | 'advanced';
export type StepType = 'lesson' | 'quiz' | 'practice';

export interface TopicMemory {
  confidence: number;
  lastReviewed: string;
  timesTested: number;
}

export interface Memory {
  topics: {
    [topic: string]: TopicMemory;
  };
}

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
  currentStep?: NextStep;
  memory: Memory;
  history: HistoryEntry[];
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
