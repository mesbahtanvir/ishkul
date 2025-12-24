// Type definitions for the learning app

// ============================================
// Block Types (3-Stage Generation)
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
  instruction: string;
  hints?: string[];
  successCriteria?: string[];
  solution?: string;
}

export interface FlashcardContent {
  front: string;
  back: string;
  hint?: string;
}

export interface SummaryContent {
  keyPoints: string[];
  nextUp?: string;
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

// Course Outline structure (uses Section/Lesson)
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
  metadata?: OutlineMetadata;
  generatedAt: number;
}

// Course - represents a single learning journey
export interface Course {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  status?: CourseStatus;
  outlineStatus?: OutlineStatus;
  progress: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  outline?: CourseOutline;
  currentPosition?: LessonPosition;
  courseProgress?: CourseProgress;
  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  completedAt?: number;
  archivedAt?: number;
}

export interface UserDocument {
  uid: string;
  email?: string;
  displayName?: string;
  courses: Course[];
  createdAt: number;
  updatedAt: number;
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
  dailyTokens: UsageLimit;
  weeklyTokens: UsageLimit;
  activePaths: UsageLimit;
}

export interface SubscriptionStatus {
  tier: TierType;
  status: SubscriptionStatusType;
  paidUntil: string | null;
  limits: UsageLimits;
  canUpgrade: boolean;
  canGenerate: boolean;
  canCreatePath: boolean;
  limitReached?: string; // 'daily' | 'weekly' | 'system'
  dailyLimitResetAt: string | null;
  weeklyLimitResetAt: string | null;
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
  code: 'COURSE_LIMIT_REACHED' | 'TOKEN_LIMIT_REACHED';
  canUpgrade: boolean;
  currentTier: TierType;
  limits: UsageLimits;
  limitReached?: string; // 'daily' | 'weekly'
  dailyLimitResetAt?: string;
  weeklyLimitResetAt?: string;
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

// Helper function to get course title
export function getCourseTitle(course: Course): string {
  return course.title || 'Untitled Course';
}
