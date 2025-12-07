/**
 * Analytics Event Definitions
 *
 * Type-safe event definitions for Firebase Analytics.
 * See docs/ANALYTICS.md for full event documentation.
 */

// =============================================================================
// Base Types
// =============================================================================

export type StepType = 'lesson' | 'quiz' | 'practice' | 'review' | 'summary';
export type AuthMethod = 'google' | 'email';
export type ThemeMode = 'light' | 'dark' | 'system';

// =============================================================================
// Event Parameter Types
// =============================================================================

// Authentication Events
export interface SignUpParams {
  method: AuthMethod;
}

export interface LoginParams {
  method: AuthMethod;
}

export interface LogoutParams {
  session_duration_sec: number;
}

// Onboarding Events
export interface OnboardingStartParams {
  is_new_user: boolean;
}

export interface GoalSelectedParams {
  goal: string;
}

export interface OnboardingCompleteParams {
  goal: string;
  duration_sec: number;
}

// Learning Path Events
export interface CourseCreatedParams {
  path_id: string;
  goal: string;
  is_first_path: boolean;
}

export interface CourseOpenedParams {
  path_id: string;
  goal: string;
  progress: number;
  steps_count: number;
}

export interface CourseDeletedParams {
  path_id: string;
  progress_at_deletion: number;
  steps_completed: number;
}

// Step Events
export interface StepStartedParams {
  path_id: string;
  step_id: string;
  step_type: StepType;
  topic: string;
  step_index: number;
}

export interface StepCompletedParams {
  path_id: string;
  step_id: string;
  step_type: StepType;
  topic: string;
  duration_sec: number;
  active_time_sec: number;
  score?: number;
}

export interface LessonCompletedParams {
  path_id: string;
  step_id: string;
  topic: string;
  active_time_sec: number;
}

export interface PracticeCompletedParams {
  path_id: string;
  step_id: string;
  topic: string;
  active_time_sec: number;
  hints_used: number;
}

// Quiz Events (per question tracking)
export interface QuizStartedParams {
  path_id: string;
  step_id: string;
  topic: string;
}

export interface QuizQuestionAnsweredParams {
  path_id: string;
  step_id: string;
  topic: string;
  is_correct: boolean;
  answer_time_sec: number;
}

export interface QuizCompletedParams {
  path_id: string;
  step_id: string;
  topic: string;
  score: number;
  total_time_sec: number;
  active_time_sec: number;
}

// AI Performance Events
export interface NextStepRequestedParams {
  path_id: string;
  current_progress: number;
}

export interface NextStepGeneratedParams {
  path_id: string;
  step_type: StepType;
  topic: string;
  response_time_ms: number;
  model_used: string;
}

export interface AIErrorParams {
  path_id: string;
  error_type: string;
  retry_count: number;
}

// Session Events
export interface AppOpenParams {
  days_since_last_session: number;
  is_first_open: boolean;
}

export interface SessionStartParams {
  platform: string;
  app_version: string;
}

export interface SessionEndParams {
  active_duration_sec: number;
  total_duration_sec: number;
  steps_completed: number;
  screens_viewed: number;
}

// Settings Events
export interface ThemeChangedParams {
  from_theme: ThemeMode;
  to_theme: ThemeMode;
}

export interface ProgressViewedParams {
  total_completed: number;
  avg_score: number;
  topics_mastered: number;
}

export interface DeleteAccountInitiatedParams {
  account_age_days: number;
  paths_count: number;
  steps_completed: number;
}

// Screen View Event
export interface ScreenViewParams {
  screen_name: string;
  screen_class: string;
}

// =============================================================================
// Event Union Type
// =============================================================================

export type AnalyticsEvent =
  // Authentication
  | { name: 'sign_up'; params: SignUpParams }
  | { name: 'login'; params: LoginParams }
  | { name: 'logout'; params: LogoutParams }

  // Onboarding
  | { name: 'onboarding_start'; params: OnboardingStartParams }
  | { name: 'goal_selected'; params: GoalSelectedParams }
  | { name: 'onboarding_complete'; params: OnboardingCompleteParams }

  // Learning Path
  | { name: 'learning_path_created'; params: CourseCreatedParams }
  | { name: 'learning_path_opened'; params: CourseOpenedParams }
  | { name: 'learning_path_deleted'; params: CourseDeletedParams }

  // Steps
  | { name: 'step_started'; params: StepStartedParams }
  | { name: 'step_completed'; params: StepCompletedParams }
  | { name: 'lesson_completed'; params: LessonCompletedParams }
  | { name: 'practice_completed'; params: PracticeCompletedParams }

  // Quiz
  | { name: 'quiz_started'; params: QuizStartedParams }
  | { name: 'quiz_question_answered'; params: QuizQuestionAnsweredParams }
  | { name: 'quiz_completed'; params: QuizCompletedParams }

  // AI Performance
  | { name: 'next_step_requested'; params: NextStepRequestedParams }
  | { name: 'next_step_generated'; params: NextStepGeneratedParams }
  | { name: 'ai_error'; params: AIErrorParams }

  // Session
  | { name: 'app_open'; params: AppOpenParams }
  | { name: 'session_start'; params: SessionStartParams }
  | { name: 'session_end'; params: SessionEndParams }

  // Settings
  | { name: 'theme_changed'; params: ThemeChangedParams }
  | { name: 'progress_viewed'; params: ProgressViewedParams }
  | { name: 'delete_account_initiated'; params: DeleteAccountInitiatedParams }

  // Screen Views
  | { name: 'screen_view'; params: ScreenViewParams };

// =============================================================================
// User Properties
// =============================================================================

export interface UserProperties {
  user_tier?: 'free' | 'premium';
  signup_method?: AuthMethod;
  courses_created_count?: number;
  total_steps_completed?: number;
  avg_quiz_score?: 'low' | 'medium' | 'high';
  days_since_signup?: number;
  last_active_date?: string;
}

// =============================================================================
// Event Names (for type-safe access)
// =============================================================================

export const EventNames = {
  // Auth
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Onboarding
  ONBOARDING_START: 'onboarding_start',
  GOAL_SELECTED: 'goal_selected',
  ONBOARDING_COMPLETE: 'onboarding_complete',

  // Learning Path
  LEARNING_COURSE_CREATED: 'learning_path_created',
  LEARNING_COURSE_OPENED: 'learning_path_opened',
  LEARNING_COURSE_DELETED: 'learning_path_deleted',

  // Steps
  STEP_STARTED: 'step_started',
  STEP_COMPLETED: 'step_completed',
  LESSON_COMPLETED: 'lesson_completed',
  PRACTICE_COMPLETED: 'practice_completed',

  // Quiz
  QUIZ_STARTED: 'quiz_started',
  QUIZ_QUESTION_ANSWERED: 'quiz_question_answered',
  QUIZ_COMPLETED: 'quiz_completed',

  // AI
  NEXT_STEP_REQUESTED: 'next_step_requested',
  NEXT_STEP_GENERATED: 'next_step_generated',
  AI_ERROR: 'ai_error',

  // Session
  APP_OPEN: 'app_open',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // Settings
  THEME_CHANGED: 'theme_changed',
  PROGRESS_VIEWED: 'progress_viewed',
  DELETE_ACCOUNT_INITIATED: 'delete_account_initiated',

  // Screen
  SCREEN_VIEW: 'screen_view',
} as const;

// =============================================================================
// Screen Names (for consistent tracking)
// =============================================================================

export const ScreenNames = {
  LOGIN: 'Login',
  GOAL_SELECTION: 'GoalSelection',
  LEVEL_SELECTION: 'LevelSelection',
  HOME: 'Home',
  LEARNING_PATH: 'Course',
  STEP_DETAIL: 'StepDetail',
  LESSON: 'Lesson',
  QUIZ: 'Quiz',
  PRACTICE: 'Practice',
  PROGRESS: 'Progress',
  SETTINGS: 'Settings',
} as const;
