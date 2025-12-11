// Type definitions for the learning app

export type StepType = 'lesson' | 'quiz' | 'practice' | 'review' | 'summary' | 'flashcard';

// Maximum character length for step content
export const MAX_STEP_CONTENT_LENGTH = 2000;

// Number of steps before memory compaction triggers
export const COMPACTION_INTERVAL = 10;

// ============================================
// Block Types (New 3-Stage Generation)
// ============================================

export type BlockType = 'text' | 'code' | 'question' | 'task' | 'flashcard' | 'summary';

export type ContentStatus = 'pending' | 'generating' | 'ready' | 'error';

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'code';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: Option[];
  correctAnswer: string;
  explanation?: string;
  hints?: string[];
  points?: number;
}

export interface TextContent {
  markdown: string;
}

export interface CodeContent {
  language: string;
  code: string;
  explanation?: string;
}

export interface QuestionContent {
  question: Question;
}

export interface TaskContent {
  instructions: string;
  steps?: string[];
  hints?: string[];
  successCriteria?: string;
}

export interface FlashcardContent {
  front: string;
  back: string;
  hints?: string[];
}

export interface SummaryContent {
  keyPoints: string[];
  nextSteps?: string;
}

export interface BlockContent {
  text?: TextContent;
  code?: CodeContent;
  question?: QuestionContent;
  task?: TaskContent;
  flashcard?: FlashcardContent;
  summary?: SummaryContent;
}

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  purpose: string;
  order: number;
  contentStatus: ContentStatus;
  contentError?: string;
  content?: BlockContent;
}

// ============================================
// Progress Types
// ============================================

export interface BlockResult {
  blockId: string;
  blockType: BlockType;
  completed: boolean;
  completedAt?: number;
  userAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  attempts?: number;
  selfReportedComplete?: boolean;
  timeSpent?: number; // seconds
}

export interface LessonProgress {
  currentBlockIndex?: number;
  blockResults?: BlockResult[];
  startedAt?: number;
  completedAt?: number;
  score?: number;
  timeSpent?: number; // seconds
  // Additional fields for local tracking
  lessonId?: string;
  completedBlocks?: string[]; // IDs of completed blocks
  lastBlockId?: string;
  updatedAt?: number;
}

export interface CompletedLessonSummary {
  lessonId: string;
  sectionId: string;
  title: string;
  score: number;
  timeSpent: number;
  keyConceptsLearned: string[];
  completedAt: number;
}

export interface CourseProgress {
  completedLessons: CompletedLessonSummary[];
  currentLessonId?: string;
  currentSectionId?: string;
  overallScore: number;
  totalTimeSpent: number; // minutes
  strugglingTopics: string[];
  lastAccessedAt: number;
}

// ============================================
// Lesson and Section Types (New Structure)
// ============================================

export type LessonStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'locked';
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  blocksStatus: ContentStatus;
  blocksError?: string;
  blocks?: Block[];
  status: LessonStatus;
  progress?: LessonProgress;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningOutcomes: string[];
  lessons: Lesson[];
  status: SectionStatus;
}

export interface LessonPosition {
  sectionId: string;
  lessonId: string;
  sectionIndex: number;
  lessonIndex: number;
}

// ============================================
// Legacy Types (kept for backward compatibility)
// ============================================

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

// Step represents a single step in the course (legacy - kept for backward compatibility)
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

// Course status constants (must match backend)
export type CourseStatus = 'active' | 'completed' | 'archived' | 'deleted';

export const CourseStatuses = {
  ACTIVE: 'active' as CourseStatus,
  COMPLETED: 'completed' as CourseStatus,
  ARCHIVED: 'archived' as CourseStatus,
  DELETED: 'deleted' as CourseStatus,
} as const;

// Outline status constants (must match backend)
export type OutlineStatus = 'generating' | 'ready' | 'failed';

export const OutlineStatuses = {
  GENERATING: 'generating' as OutlineStatus,
  READY: 'ready' as OutlineStatus,
  FAILED: 'failed' as OutlineStatus,
} as const;

// Course outline metadata
export interface OutlineMetadata {
  difficulty: string;
  category: string;
  tags: string[];
}

// New Course Outline structure (uses Section/Lesson)
export interface CourseOutline {
  title: string;
  description: string;
  emoji: string;
  estimatedMinutes: number;
  difficulty: string;
  category: string;
  prerequisites: string[];
  learningOutcomes: string[];
  sections: Section[];
  // Legacy compatibility: modules is an alias for sections with legacy structure
  modules?: OutlineModule[];
  metadata?: OutlineMetadata;
  generatedAt: number;
}

// Course - represents a single learning journey
export interface Course {
  id: string;
  userId: string;
  title: string; // Renamed from 'goal'
  emoji: string;
  status?: CourseStatus;
  outlineStatus?: OutlineStatus;
  progress: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  // New structure
  outline?: CourseOutline;
  currentPosition?: LessonPosition;
  courseProgress?: CourseProgress;
  // Legacy fields (kept for backward compatibility)
  goal?: string; // Deprecated: use title instead
  steps?: Step[];
  memory?: Memory;
  outlinePosition?: OutlinePosition;
  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  completedAt?: number;
  archivedAt?: number;
}

// Legacy outline types (kept for backward compatibility)
export interface TopicPerformance {
  score: number;
  timeSpent: number;
  completedAt: number;
}

export interface OutlineTopic {
  id: string;
  title: string;
  toolId: string;
  estimatedMinutes: number;
  description: string;
  prerequisites: string[];
  status: 'pending' | 'completed' | 'skipped' | 'needs_review';
  stepId?: string;
  performance?: TopicPerformance;
}

export interface OutlineModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningOutcomes: string[];
  topics: OutlineTopic[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export interface OutlinePosition {
  moduleIndex: number;
  topicIndex: number;
  moduleId: string;
  topicId: string;
}

export interface UserDocument {
  uid: string;
  email?: string;
  displayName?: string;
  courses: Course[];
  goal?: string;
  memory?: Memory;
  history?: HistoryEntry[];
  nextStep?: NextStep;
  createdAt: number;
  updatedAt: number;
}

export interface LLMRequest {
  goal: string;
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
  activeCourses: UsageLimit;
}

export interface SubscriptionStatus {
  tier: TierType;
  status: SubscriptionStatusType;
  paidUntil: string | null;
  limits: UsageLimits;
  canUpgrade: boolean;
  canGenerateSteps: boolean;
  canCreateCourse: boolean;
  dailyLimitResetAt: string | null;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PortalSessionResponse {
  portalUrl: string;
}

export interface VerifyCheckoutResponse {
  success: boolean;
  tier: TierType;
  message?: string;
}

export interface PaymentSheetParams {
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
  subscriptionId: string;
}

// Limit error response from API
export interface LimitErrorResponse {
  error: string;
  code: 'COURSE_LIMIT_REACHED' | 'DAILY_STEP_LIMIT_REACHED';
  canUpgrade: boolean;
  currentTier: TierType;
  limits: UsageLimits;
  dailyLimitResetAt?: string;
  existingSteps?: Step[];
}

// ============================================
// User Context Types (for personalized learning)
// ============================================

export type SkillLevel = 'beginner' | 'intermediate' | 'proficient' | 'expert';
export type SkillIntent = 'know' | 'improving' | 'want_to_learn';

export interface UserSkill {
  name: string;
  level: SkillLevel;
  intent: SkillIntent;
  targetLevel?: SkillLevel;
  context?: string; // e.g., "Used at work for 5 years"
}

export interface ParsedContext {
  professional: {
    role?: string;
    company?: string;
    yearsExperience?: number;
    industry?: string;
  };
  location: {
    current?: string;
    journey?: string[]; // ["Bangladesh", "Singapore", "Canada"]
  };
  personality?: string; // "INFP", "INTJ", etc.
  skills: UserSkill[];
  interests: string[];
  goals: string[];
  preferences: {
    learningStyle?: 'visual' | 'reading' | 'hands-on' | 'mixed';
    studyTime?: string; // "evenings", "mornings"
    sessionLength?: string; // "15 minutes", "30 minutes"
  };
}

export interface ContextInputHistory {
  text: string;
  timestamp: number;
  changesApplied: string[];
}

export interface DerivedContext {
  avgQuizScore: number;
  completedCourses: number;
  currentStreak: number;
  mostActiveHours: number[];
  topicsStudied: string[];
  totalLearningTime: number; // minutes
  lastUpdated: number;
}

export interface ContextChange {
  type: 'added' | 'updated' | 'removed';
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

export interface UserContext {
  // All raw inputs (append-only log)
  inputHistory: ContextInputHistory[];
  // Current merged context
  parsed: ParsedContext;
  // Auto-derived from usage
  derived: DerivedContext;
  // Generated summary for AI prompts
  summary: string;
  // Metadata
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContextUpdateResponse {
  previousContext: ParsedContext;
  updatedContext: ParsedContext;
  changes: ContextChange[];
  confidence: number;
  summary: string;
}

// ============================================
// API Request/Response Types (New Lesson/Block Endpoints)
// ============================================

// GET /api/courses/{id}/lessons/{lessonId}
export interface GetLessonResponse {
  lesson: Lesson;
  sectionId: string;
}

// POST /api/courses/{id}/lessons/{lessonId}/generate-blocks
export interface GenerateBlocksResponse {
  status: ContentStatus;
  blocks?: Block[];
  message?: string;
}

// POST /api/courses/{id}/lessons/{lessonId}/blocks/{blockId}/generate
export interface GenerateBlockContentResponse {
  status: ContentStatus;
  content?: BlockContent;
  message?: string;
}

// POST /api/courses/{id}/lessons/{lessonId}/blocks/{blockId}/complete
export interface CompleteBlockRequest {
  userAnswer?: string;
  score?: number;
  timeSpent?: number; // seconds
}

export interface CompleteBlockResponse {
  success: boolean;
  blockResult: BlockResult;
  lessonComplete: boolean;
  lessonProgress: LessonProgress;
}

// Course create request (updated for new structure)
export interface CourseCreateRequest {
  title: string; // Was 'goal'
  emoji?: string;
  category?: string;
}

// Helper function to get course title (handles legacy 'goal' field)
export function getCourseTitle(course: Course): string {
  return course.title || course.goal || 'Untitled Course';
}
