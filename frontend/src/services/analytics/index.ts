/**
 * Analytics Module
 *
 * Unified analytics for Ishkul app.
 * See docs/ANALYTICS.md for full documentation.
 *
 * Usage:
 * ```typescript
 * // In components
 * import { useAnalytics, useScreenTracking } from '@/services/analytics';
 *
 * function MyScreen() {
 *   useScreenTracking('MyScreen', 'MyScreenComponent');
 *   const { trackStepStarted } = useAnalytics();
 *   // ...
 * }
 *
 * // Direct service access
 * import { analytics } from '@/services/analytics';
 * await analytics.trackLogin({ method: 'google' });
 * ```
 */

// Core service
export { analytics } from './analyticsService';

// Offline queue
export { offlineQueue } from './offlineQueue';
export type { QueuedEvent } from './offlineQueue';

// Event types and constants
export type {
  AnalyticsEvent,
  UserProperties,
  StepType,
  AuthMethod,
  ThemeMode,
  // Event params
  SignUpParams,
  LoginParams,
  LogoutParams,
  OnboardingStartParams,
  GoalSelectedParams,
  OnboardingCompleteParams,
  LearningPathCreatedParams,
  LearningPathOpenedParams,
  LearningPathDeletedParams,
  StepStartedParams,
  StepCompletedParams,
  LessonCompletedParams,
  PracticeCompletedParams,
  QuizStartedParams,
  QuizQuestionAnsweredParams,
  QuizCompletedParams,
  NextStepRequestedParams,
  NextStepGeneratedParams,
  AIErrorParams,
  AppOpenParams,
  SessionStartParams,
  SessionEndParams,
  ThemeChangedParams,
  ProgressViewedParams,
  DeleteAccountInitiatedParams,
  ScreenViewParams,
} from './events';

export { EventNames, ScreenNames } from './events';

// React hooks
export {
  useAnalytics,
  useScreenTracking,
  useActiveTime,
  useStepTracking,
  useQuizTracking,
  useOnboardingTracking,
  useAITracking,
  useSessionTracking,
  useThemeTracking,
} from './hooks';
