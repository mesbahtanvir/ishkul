// Type definitions for the learning app

export type LevelType = 'beginner' | 'intermediate' | 'advanced';
export type StepType = 'lesson' | 'quiz' | 'practice' | 'review' | 'summary' | 'flashcard';

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

// Learning path status constants (must match backend)
export type PathStatus = 'active' | 'completed' | 'archived' | 'deleted';

export const PathStatuses = {
  ACTIVE: 'active' as PathStatus,
  COMPLETED: 'completed' as PathStatus,
  ARCHIVED: 'archived' as PathStatus,
  DELETED: 'deleted' as PathStatus,
} as const;

// Learning Path - represents a single learning journey
export interface LearningPath {
  id: string;
  goal: string;
  level: LevelType;
  emoji: string;
  status?: PathStatus; // Path status: active, completed, archived, deleted
  progress: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  steps: Step[]; // All steps (completed and current)
  memory: Memory;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  completedAt?: number; // Timestamp when path was completed
  archivedAt?: number; // Timestamp when path was archived
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

// Subscription types
export type TierType = 'free' | 'pro';
export type SubscriptionStatusType = 'active' | 'canceled' | 'past_due' | 'trialing' | null;

export interface UsageLimit {
  used: number;
  limit: number;
}

export interface UsageLimits {
  dailySteps: UsageLimit;
  activePaths: UsageLimit;
}

export interface SubscriptionStatus {
  tier: TierType;
  status: SubscriptionStatusType;
  paidUntil: string | null;
  limits: UsageLimits;
  canUpgrade: boolean;
  canGenerateSteps: boolean;
  canCreatePath: boolean;
  dailyLimitResetAt: string | null;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PortalSessionResponse {
  portalUrl: string;
}

// Limit error response from API
export interface LimitErrorResponse {
  error: string;
  code: 'PATH_LIMIT_REACHED' | 'DAILY_STEP_LIMIT_REACHED';
  canUpgrade: boolean;
  currentTier: TierType;
  limits: UsageLimits;
  dailyLimitResetAt?: string;
  existingSteps?: Step[];
}
