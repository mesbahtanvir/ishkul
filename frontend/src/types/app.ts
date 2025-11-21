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

export interface UserDocument {
  uid: string;
  email?: string;
  displayName?: string;
  goal: string;
  level: LevelType;
  memory: Memory;
  history: HistoryEntry[];
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
