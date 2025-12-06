import { Platform } from 'react-native';
import { analytics } from '../analyticsService';
import { offlineQueue } from '../offlineQueue';
import { EventNames } from '../events';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

jest.mock('../offlineQueue', () => ({
  offlineQueue: {
    initialize: jest.fn().mockResolvedValue(undefined),
    setSendBatch: jest.fn(),
    sync: jest.fn().mockResolvedValue(0),
    enqueue: jest.fn().mockResolvedValue(undefined),
    getQueueSize: jest.fn().mockReturnValue(0),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset analytics internal state by creating fresh spy
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize offline queue', async () => {
      await analytics.initialize();
      expect(offlineQueue.initialize).toHaveBeenCalled();
    });

    it('should set up batch sender for offline queue', async () => {
      await analytics.initialize();
      expect(offlineQueue.setSendBatch).toHaveBeenCalled();
    });

    it('should sync offline events on init', async () => {
      await analytics.initialize();
      expect(offlineQueue.sync).toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('should enable analytics', () => {
      analytics.setEnabled(true);
      // No error means success
    });

    it('should disable analytics', () => {
      analytics.setEnabled(false);
      // No error means success
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      analytics.setDebugMode(true);
      // No error means success
    });

    it('should disable debug mode', () => {
      analytics.setDebugMode(false);
      // No error means success
    });
  });

  describe('setUserId', () => {
    it('should set user ID', () => {
      analytics.setUserId('user-123');
      // No error means success
    });

    it('should accept null user ID', () => {
      analytics.setUserId(null);
      // No error means success
    });
  });

  describe('setUserProperties', () => {
    it('should set user properties', () => {
      analytics.setUserProperties({
        user_tier: 'free',
        signup_method: 'google',
        paths_created_count: 5,
      });
      // No error means success
    });

    it('should handle empty properties', () => {
      analytics.setUserProperties({});
      // No error means success
    });
  });

  describe('trackScreen', () => {
    it('should track screen view', async () => {
      await analytics.trackScreen('HomeScreen', 'HomeScreen');
      // Method should complete without error
    });
  });

  describe('session management', () => {
    it('should start session', async () => {
      await analytics.startSession();
      // Method should complete without error
    });

    it('should end session', async () => {
      await analytics.startSession();
      await analytics.endSession();
      // Method should complete without error
    });

    it('should mark user as active', () => {
      analytics.markActive();
      // No error means success
    });

    it('should mark user as inactive', () => {
      analytics.markInactive();
      // No error means success
    });

    it('should get active time', () => {
      const time = analytics.getActiveTime();
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });

    it('should increment steps completed', () => {
      analytics.incrementStepsCompleted();
      // No error means success
    });
  });

  describe('auth events', () => {
    it('should track sign up', async () => {
      await analytics.trackSignUp({ method: 'google' });
    });

    it('should track login', async () => {
      await analytics.trackLogin({ method: 'email' });
    });

    it('should track logout', async () => {
      await analytics.trackLogout({ session_duration_sec: 3600 });
    });
  });

  describe('onboarding events', () => {
    it('should track onboarding start', async () => {
      await analytics.trackOnboardingStart({ is_new_user: true });
    });

    it('should track goal selected', async () => {
      await analytics.trackGoalSelected({ goal: 'Learn Python' });
    });

    it('should track level selected', async () => {
      await analytics.trackLevelSelected({ level: 'beginner' });
    });

    it('should track onboarding complete', async () => {
      await analytics.trackOnboardingComplete({
        goal: 'Learn Python',
        level: 'beginner',
        duration_sec: 120,
      });
    });
  });

  describe('learning path events', () => {
    it('should track learning path created', async () => {
      await analytics.trackLearningPathCreated({
        path_id: 'path-123',
        goal: 'Learn Python',
        level: 'beginner',
        is_first_path: true,
      });
    });

    it('should track learning path opened', async () => {
      await analytics.trackLearningPathOpened({
        path_id: 'path-123',
        goal: 'Learn Python',
        progress: 50,
        steps_count: 10,
      });
    });

    it('should track learning path deleted', async () => {
      await analytics.trackLearningPathDeleted({
        path_id: 'path-123',
        progress_at_deletion: 30,
        steps_completed: 3,
      });
    });
  });

  describe('step events', () => {
    it('should track step started', async () => {
      await analytics.trackStepStarted({
        path_id: 'path-123',
        step_id: 'step-1',
        step_type: 'lesson',
        topic: 'Variables',
        step_index: 0,
      });
    });

    it('should track step completed', async () => {
      await analytics.trackStepCompleted({
        path_id: 'path-123',
        step_id: 'step-1',
        step_type: 'lesson',
        topic: 'Variables',
        duration_sec: 300,
        active_time_sec: 250,
      });
    });

    it('should track lesson completed', async () => {
      await analytics.trackLessonCompleted({
        path_id: 'path-123',
        step_id: 'step-1',
        topic: 'Variables',
        active_time_sec: 200,
      });
    });

    it('should track practice completed', async () => {
      await analytics.trackPracticeCompleted({
        path_id: 'path-123',
        step_id: 'step-2',
        topic: 'Loops',
        active_time_sec: 180,
        hints_used: 2,
      });
    });
  });

  describe('quiz events', () => {
    it('should track quiz started', async () => {
      await analytics.trackQuizStarted({
        path_id: 'path-123',
        step_id: 'step-3',
        topic: 'Functions',
      });
    });

    it('should track quiz question answered', async () => {
      await analytics.trackQuizQuestionAnswered({
        path_id: 'path-123',
        step_id: 'step-3',
        topic: 'Functions',
        is_correct: true,
        answer_time_sec: 15,
      });
    });

    it('should track quiz completed', async () => {
      await analytics.trackQuizCompleted({
        path_id: 'path-123',
        step_id: 'step-3',
        topic: 'Functions',
        score: 80,
        total_time_sec: 300,
        active_time_sec: 280,
      });
    });
  });

  describe('AI events', () => {
    it('should track next step requested', async () => {
      await analytics.trackNextStepRequested({
        path_id: 'path-123',
        current_progress: 40,
      });
    });

    it('should track next step generated', async () => {
      await analytics.trackNextStepGenerated({
        path_id: 'path-123',
        step_type: 'quiz',
        topic: 'Classes',
        response_time_ms: 2500,
        model_used: 'gpt-4o-mini',
      });
    });

    it('should track AI error', async () => {
      await analytics.trackAIError({
        path_id: 'path-123',
        error_type: 'timeout',
        retry_count: 2,
      });
    });
  });

  describe('session events', () => {
    it('should track app open', async () => {
      await analytics.trackAppOpen({
        days_since_last_session: 3,
        is_first_open: false,
      });
    });
  });

  describe('settings events', () => {
    it('should track theme changed', async () => {
      await analytics.trackThemeChanged({
        from_theme: 'light',
        to_theme: 'dark',
      });
    });

    it('should track progress viewed', async () => {
      await analytics.trackProgressViewed({
        total_completed: 25,
        avg_score: 85,
        topics_mastered: 5,
      });
    });

    it('should track delete account initiated', async () => {
      await analytics.trackDeleteAccountInitiated({
        account_age_days: 30,
        paths_count: 3,
        steps_completed: 45,
      });
    });
  });

  describe('offline queue integration', () => {
    it('should sync offline events', async () => {
      const count = await analytics.syncOfflineEvents();
      expect(typeof count).toBe('number');
    });

    it('should get offline queue size', () => {
      const size = analytics.getOfflineQueueSize();
      expect(typeof size).toBe('number');
    });
  });
});

describe('EventNames', () => {
  it('should have all auth event names', () => {
    expect(EventNames.SIGN_UP).toBe('sign_up');
    expect(EventNames.LOGIN).toBe('login');
    expect(EventNames.LOGOUT).toBe('logout');
  });

  it('should have all onboarding event names', () => {
    expect(EventNames.ONBOARDING_START).toBe('onboarding_start');
    expect(EventNames.GOAL_SELECTED).toBe('goal_selected');
    expect(EventNames.LEVEL_SELECTED).toBe('level_selected');
    expect(EventNames.ONBOARDING_COMPLETE).toBe('onboarding_complete');
  });

  it('should have all learning path event names', () => {
    expect(EventNames.LEARNING_PATH_CREATED).toBe('learning_path_created');
    expect(EventNames.LEARNING_PATH_OPENED).toBe('learning_path_opened');
    expect(EventNames.LEARNING_PATH_DELETED).toBe('learning_path_deleted');
  });

  it('should have all step event names', () => {
    expect(EventNames.STEP_STARTED).toBe('step_started');
    expect(EventNames.STEP_COMPLETED).toBe('step_completed');
    expect(EventNames.LESSON_COMPLETED).toBe('lesson_completed');
    expect(EventNames.PRACTICE_COMPLETED).toBe('practice_completed');
  });

  it('should have all quiz event names', () => {
    expect(EventNames.QUIZ_STARTED).toBe('quiz_started');
    expect(EventNames.QUIZ_QUESTION_ANSWERED).toBe('quiz_question_answered');
    expect(EventNames.QUIZ_COMPLETED).toBe('quiz_completed');
  });

  it('should have all AI event names', () => {
    expect(EventNames.NEXT_STEP_REQUESTED).toBe('next_step_requested');
    expect(EventNames.NEXT_STEP_GENERATED).toBe('next_step_generated');
    expect(EventNames.AI_ERROR).toBe('ai_error');
  });

  it('should have all session event names', () => {
    expect(EventNames.APP_OPEN).toBe('app_open');
    expect(EventNames.SESSION_START).toBe('session_start');
    expect(EventNames.SESSION_END).toBe('session_end');
  });

  it('should have all settings event names', () => {
    expect(EventNames.THEME_CHANGED).toBe('theme_changed');
    expect(EventNames.PROGRESS_VIEWED).toBe('progress_viewed');
    expect(EventNames.DELETE_ACCOUNT_INITIATED).toBe('delete_account_initiated');
  });

  it('should have screen view event name', () => {
    expect(EventNames.SCREEN_VIEW).toBe('screen_view');
  });
});
