/**
 * Analytics React Hooks
 *
 * Convenient hooks for tracking analytics in React components.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { analytics } from './analyticsService';
import type { StepType, Level, ThemeMode } from './events';
import { ScreenNames } from './events';

// =============================================================================
// useAnalytics - Main analytics hook
// =============================================================================

/**
 * Main analytics hook providing access to all tracking methods
 */
export function useAnalytics() {
  return {
    // Service methods
    trackScreen: analytics.trackScreen.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics),

    // Auth
    trackSignUp: analytics.trackSignUp.bind(analytics),
    trackLogin: analytics.trackLogin.bind(analytics),
    trackLogout: analytics.trackLogout.bind(analytics),

    // Onboarding
    trackOnboardingStart: analytics.trackOnboardingStart.bind(analytics),
    trackGoalSelected: analytics.trackGoalSelected.bind(analytics),
    trackLevelSelected: analytics.trackLevelSelected.bind(analytics),
    trackOnboardingComplete: analytics.trackOnboardingComplete.bind(analytics),

    // Learning Path
    trackLearningPathCreated:
      analytics.trackLearningPathCreated.bind(analytics),
    trackLearningPathOpened: analytics.trackLearningPathOpened.bind(analytics),
    trackLearningPathDeleted:
      analytics.trackLearningPathDeleted.bind(analytics),

    // Steps
    trackStepStarted: analytics.trackStepStarted.bind(analytics),
    trackStepCompleted: analytics.trackStepCompleted.bind(analytics),
    trackLessonCompleted: analytics.trackLessonCompleted.bind(analytics),
    trackPracticeCompleted: analytics.trackPracticeCompleted.bind(analytics),

    // Quiz
    trackQuizStarted: analytics.trackQuizStarted.bind(analytics),
    trackQuizQuestionAnswered:
      analytics.trackQuizQuestionAnswered.bind(analytics),
    trackQuizCompleted: analytics.trackQuizCompleted.bind(analytics),

    // AI
    trackNextStepRequested: analytics.trackNextStepRequested.bind(analytics),
    trackNextStepGenerated: analytics.trackNextStepGenerated.bind(analytics),
    trackAIError: analytics.trackAIError.bind(analytics),

    // Session
    trackAppOpen: analytics.trackAppOpen.bind(analytics),
    startSession: analytics.startSession.bind(analytics),
    endSession: analytics.endSession.bind(analytics),

    // Settings
    trackThemeChanged: analytics.trackThemeChanged.bind(analytics),
    trackProgressViewed: analytics.trackProgressViewed.bind(analytics),
    trackDeleteAccountInitiated:
      analytics.trackDeleteAccountInitiated.bind(analytics),

    // Active time
    getActiveTime: analytics.getActiveTime.bind(analytics),
  };
}

// =============================================================================
// useScreenTracking - Automatic screen view tracking
// =============================================================================

/**
 * Track screen views automatically when component mounts
 */
export function useScreenTracking(
  screenName: keyof typeof ScreenNames | string,
  screenClass: string
) {
  useEffect(() => {
    const name =
      typeof screenName === 'string' && screenName in ScreenNames
        ? ScreenNames[screenName as keyof typeof ScreenNames]
        : screenName;

    analytics.trackScreen(name, screenClass);
  }, [screenName, screenClass]);
}

// =============================================================================
// useActiveTime - Track active engagement time
// =============================================================================

interface ActiveTimeResult {
  getActiveSeconds: () => number;
  resetTimer: () => void;
}

/**
 * Track active time on a screen/component
 * Returns active time in seconds
 */
export function useActiveTime(): ActiveTimeResult {
  const startTimeRef = useRef<number>(Date.now());
  const activeTimeRef = useRef<number>(0);
  const lastActiveRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground
        isActiveRef.current = true;
        lastActiveRef.current = Date.now();
        analytics.markActive();
      } else {
        // App went to background
        if (isActiveRef.current) {
          activeTimeRef.current += Date.now() - lastActiveRef.current;
          isActiveRef.current = false;
          analytics.markInactive();
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    // Mark active on mount
    analytics.markActive();

    return () => {
      subscription.remove();
      // Calculate final active time on unmount
      if (isActiveRef.current) {
        activeTimeRef.current += Date.now() - lastActiveRef.current;
      }
      analytics.markInactive();
    };
  }, []);

  const getActiveSeconds = useCallback(() => {
    let total = activeTimeRef.current;
    if (isActiveRef.current) {
      total += Date.now() - lastActiveRef.current;
    }
    return Math.floor(total / 1000);
  }, []);

  const resetTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    activeTimeRef.current = 0;
    lastActiveRef.current = Date.now();
    isActiveRef.current = true;
  }, []);

  return { getActiveSeconds, resetTimer };
}

// =============================================================================
// useStepTracking - Track learning step engagement
// =============================================================================

interface StepTrackingParams {
  pathId: string;
  stepId: string;
  stepType: StepType;
  topic: string;
  stepIndex: number;
}

interface StepTrackingResult {
  startStep: () => void;
  completeStep: (score?: number) => Promise<void>;
  getActiveSeconds: () => number;
}

/**
 * Track step engagement (start, active time, completion)
 */
export function useStepTracking(params: StepTrackingParams): StepTrackingResult {
  const { pathId, stepId, stepType, topic, stepIndex } = params;
  const { getActiveSeconds, resetTimer } = useActiveTime();
  const startTimeRef = useRef<number>(0);
  const hasStartedRef = useRef<boolean>(false);

  const startStep = useCallback(() => {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;
    startTimeRef.current = Date.now();
    resetTimer();

    analytics.trackStepStarted({
      path_id: pathId,
      step_id: stepId,
      step_type: stepType,
      topic,
      step_index: stepIndex,
    });
  }, [pathId, stepId, stepType, topic, stepIndex, resetTimer]);

  const completeStep = useCallback(
    async (score?: number) => {
      const activeTimeSec = getActiveSeconds();
      const totalTimeSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

      await analytics.trackStepCompleted({
        path_id: pathId,
        step_id: stepId,
        step_type: stepType,
        topic,
        duration_sec: totalTimeSec,
        active_time_sec: activeTimeSec,
        score,
      });
    },
    [pathId, stepId, stepType, topic, getActiveSeconds]
  );

  return { startStep, completeStep, getActiveSeconds };
}

// =============================================================================
// useQuizTracking - Track quiz interactions
// =============================================================================

interface QuizTrackingParams {
  pathId: string;
  stepId: string;
  topic: string;
}

interface QuizTrackingResult {
  startQuiz: () => void;
  answerQuestion: (isCorrect: boolean) => Promise<void>;
  completeQuiz: (score: number) => Promise<void>;
  getActiveSeconds: () => number;
}

/**
 * Track quiz engagement (start, answers, completion)
 */
export function useQuizTracking(params: QuizTrackingParams): QuizTrackingResult {
  const { pathId, stepId, topic } = params;
  const { getActiveSeconds, resetTimer } = useActiveTime();
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);
  const hasStartedRef = useRef<boolean>(false);

  const startQuiz = useCallback(() => {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    resetTimer();

    analytics.trackQuizStarted({
      path_id: pathId,
      step_id: stepId,
      topic,
    });
  }, [pathId, stepId, topic, resetTimer]);

  const answerQuestion = useCallback(
    async (isCorrect: boolean) => {
      const answerTime = Math.floor(
        (Date.now() - questionStartRef.current) / 1000
      );
      questionStartRef.current = Date.now(); // Reset for next question

      await analytics.trackQuizQuestionAnswered({
        path_id: pathId,
        step_id: stepId,
        topic,
        is_correct: isCorrect,
        answer_time_sec: answerTime,
      });
    },
    [pathId, stepId, topic]
  );

  const completeQuiz = useCallback(
    async (score: number) => {
      const activeTimeSec = getActiveSeconds();
      const totalTimeSec = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      await analytics.trackQuizCompleted({
        path_id: pathId,
        step_id: stepId,
        topic,
        score,
        total_time_sec: totalTimeSec,
        active_time_sec: activeTimeSec,
      });
    },
    [pathId, stepId, topic, getActiveSeconds]
  );

  return { startQuiz, answerQuestion, completeQuiz, getActiveSeconds };
}

// =============================================================================
// useOnboardingTracking - Track onboarding flow
// =============================================================================

interface OnboardingTrackingResult {
  startOnboarding: (isNewUser: boolean) => void;
  selectGoal: (goal: string) => void;
  selectLevel: (level: Level) => void;
  completeOnboarding: (goal: string, level: Level) => Promise<void>;
}

/**
 * Track onboarding flow
 */
export function useOnboardingTracking(): OnboardingTrackingResult {
  const startTimeRef = useRef<number>(0);

  const startOnboarding = useCallback((isNewUser: boolean) => {
    startTimeRef.current = Date.now();
    analytics.trackOnboardingStart({ is_new_user: isNewUser });
  }, []);

  const selectGoal = useCallback((goal: string) => {
    analytics.trackGoalSelected({ goal });
  }, []);

  const selectLevel = useCallback((level: Level) => {
    analytics.trackLevelSelected({ level });
  }, []);

  const completeOnboarding = useCallback(
    async (goal: string, level: Level) => {
      const durationSec = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      await analytics.trackOnboardingComplete({
        goal,
        level,
        duration_sec: durationSec,
      });
    },
    []
  );

  return { startOnboarding, selectGoal, selectLevel, completeOnboarding };
}

// =============================================================================
// useAITracking - Track AI/LLM operations
// =============================================================================

interface AITrackingResult {
  startRequest: (pathId: string, progress: number) => number;
  completeRequest: (
    requestId: number,
    pathId: string,
    stepType: StepType,
    topic: string,
    modelUsed: string
  ) => Promise<void>;
  trackError: (
    pathId: string,
    errorType: string,
    retryCount: number
  ) => Promise<void>;
}

/**
 * Track AI/LLM request performance
 */
export function useAITracking(): AITrackingResult {
  const requestTimesRef = useRef<Map<number, number>>(new Map());
  const requestIdRef = useRef<number>(0);

  const startRequest = useCallback((pathId: string, progress: number) => {
    const requestId = ++requestIdRef.current;
    requestTimesRef.current.set(requestId, Date.now());

    analytics.trackNextStepRequested({
      path_id: pathId,
      current_progress: progress,
    });

    return requestId;
  }, []);

  const completeRequest = useCallback(
    async (
      requestId: number,
      pathId: string,
      stepType: StepType,
      topic: string,
      modelUsed: string
    ) => {
      const startTime = requestTimesRef.current.get(requestId);
      const responseTime = startTime ? Date.now() - startTime : 0;
      requestTimesRef.current.delete(requestId);

      await analytics.trackNextStepGenerated({
        path_id: pathId,
        step_type: stepType,
        topic,
        response_time_ms: responseTime,
        model_used: modelUsed,
      });
    },
    []
  );

  const trackError = useCallback(
    async (pathId: string, errorType: string, retryCount: number) => {
      await analytics.trackAIError({
        path_id: pathId,
        error_type: errorType,
        retry_count: retryCount,
      });
    },
    []
  );

  return { startRequest, completeRequest, trackError };
}

// =============================================================================
// useSessionTracking - Track app sessions
// =============================================================================

/**
 * Track app session lifecycle
 * Call this once at app root level
 */
export function useSessionTracking() {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Initialize analytics and start session
    const initAndStart = async () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      await analytics.initialize();
      await analytics.startSession();
    };

    initAndStart();

    // Handle app state for session tracking
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // End session when app goes to background
        analytics.endSession();
      } else if (nextAppState === 'active') {
        // Start new session when app comes back
        analytics.startSession();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription.remove();
      analytics.endSession();
    };
  }, []);
}

// =============================================================================
// useThemeTracking - Track theme changes
// =============================================================================

/**
 * Track theme preference changes
 */
export function useThemeTracking(currentTheme: ThemeMode) {
  const previousThemeRef = useRef<ThemeMode>(currentTheme);

  useEffect(() => {
    if (previousThemeRef.current !== currentTheme) {
      analytics.trackThemeChanged({
        from_theme: previousThemeRef.current,
        to_theme: currentTheme,
      });
      previousThemeRef.current = currentTheme;
    }
  }, [currentTheme]);
}
