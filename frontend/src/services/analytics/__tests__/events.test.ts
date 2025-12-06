import { EventNames, ScreenNames } from '../events';
import type {
  StepType,
  AuthMethod,
  ThemeMode,
  SignUpParams,
  LoginParams,
  LogoutParams,
  OnboardingStartParams,
  GoalSelectedParams,
  OnboardingCompleteParams,
  CourseCreatedParams,
  CourseOpenedParams,
  CourseDeletedParams,
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
  UserProperties,
  AnalyticsEvent,
} from '../events';

describe('Event Types', () => {
  describe('StepType', () => {
    it('should accept valid step types', () => {
      const validTypes: StepType[] = [
        'lesson',
        'quiz',
        'practice',
        'review',
        'summary',
      ];
      expect(validTypes).toHaveLength(5);
    });
  });

  describe('AuthMethod', () => {
    it('should accept valid auth methods', () => {
      const validMethods: AuthMethod[] = ['google', 'email'];
      expect(validMethods).toHaveLength(2);
    });
  });

  describe('ThemeMode', () => {
    it('should accept valid theme modes', () => {
      const validModes: ThemeMode[] = ['light', 'dark', 'system'];
      expect(validModes).toHaveLength(3);
    });
  });
});

describe('Event Parameter Types', () => {
  describe('SignUpParams', () => {
    it('should have correct structure', () => {
      const params: SignUpParams = {
        method: 'google',
      };
      expect(params.method).toBe('google');
    });
  });

  describe('LoginParams', () => {
    it('should have correct structure', () => {
      const params: LoginParams = {
        method: 'email',
      };
      expect(params.method).toBe('email');
    });
  });

  describe('LogoutParams', () => {
    it('should have correct structure', () => {
      const params: LogoutParams = {
        session_duration_sec: 3600,
      };
      expect(params.session_duration_sec).toBe(3600);
    });
  });

  describe('OnboardingStartParams', () => {
    it('should have correct structure', () => {
      const params: OnboardingStartParams = {
        is_new_user: true,
      };
      expect(params.is_new_user).toBe(true);
    });
  });

  describe('GoalSelectedParams', () => {
    it('should have correct structure', () => {
      const params: GoalSelectedParams = {
        goal: 'Learn Python',
      };
      expect(params.goal).toBe('Learn Python');
    });
  });

  describe('OnboardingCompleteParams', () => {
    it('should have correct structure', () => {
      const params: OnboardingCompleteParams = {
        goal: 'Learn JavaScript',
        duration_sec: 120,
      };
      expect(params.goal).toBe('Learn JavaScript');
      expect(params.duration_sec).toBe(120);
    });
  });

  describe('CourseCreatedParams', () => {
    it('should have correct structure', () => {
      const params: CourseCreatedParams = {
        path_id: 'path-123',
        goal: 'Learn React',
        is_first_path: false,
      };
      expect(params.path_id).toBe('path-123');
      expect(params.is_first_path).toBe(false);
    });
  });

  describe('CourseOpenedParams', () => {
    it('should have correct structure', () => {
      const params: CourseOpenedParams = {
        path_id: 'path-456',
        goal: 'Learn TypeScript',
        progress: 75,
        steps_count: 20,
      };
      expect(params.progress).toBe(75);
      expect(params.steps_count).toBe(20);
    });
  });

  describe('CourseDeletedParams', () => {
    it('should have correct structure', () => {
      const params: CourseDeletedParams = {
        path_id: 'path-789',
        progress_at_deletion: 45,
        steps_completed: 9,
      };
      expect(params.progress_at_deletion).toBe(45);
    });
  });

  describe('StepStartedParams', () => {
    it('should have correct structure', () => {
      const params: StepStartedParams = {
        path_id: 'path-1',
        step_id: 'step-1',
        step_type: 'lesson',
        topic: 'Variables',
        step_index: 0,
      };
      expect(params.step_type).toBe('lesson');
      expect(params.step_index).toBe(0);
    });
  });

  describe('StepCompletedParams', () => {
    it('should have correct structure', () => {
      const params: StepCompletedParams = {
        path_id: 'path-1',
        step_id: 'step-1',
        step_type: 'quiz',
        topic: 'Functions',
        duration_sec: 300,
        active_time_sec: 280,
        score: 90,
      };
      expect(params.duration_sec).toBe(300);
      expect(params.score).toBe(90);
    });

    it('should allow optional score', () => {
      const params: StepCompletedParams = {
        path_id: 'path-1',
        step_id: 'step-1',
        step_type: 'lesson',
        topic: 'Loops',
        duration_sec: 200,
        active_time_sec: 180,
      };
      expect(params.score).toBeUndefined();
    });
  });

  describe('QuizCompletedParams', () => {
    it('should have correct structure', () => {
      const params: QuizCompletedParams = {
        path_id: 'path-1',
        step_id: 'step-quiz',
        topic: 'Arrays',
        score: 85,
        total_time_sec: 600,
        active_time_sec: 550,
      };
      expect(params.score).toBe(85);
      expect(params.total_time_sec).toBe(600);
    });
  });

  describe('NextStepGeneratedParams', () => {
    it('should have correct structure', () => {
      const params: NextStepGeneratedParams = {
        path_id: 'path-1',
        step_type: 'practice',
        topic: 'Objects',
        response_time_ms: 2500,
        model_used: 'gpt-4o',
      };
      expect(params.response_time_ms).toBe(2500);
      expect(params.model_used).toBe('gpt-4o');
    });
  });

  describe('SessionEndParams', () => {
    it('should have correct structure', () => {
      const params: SessionEndParams = {
        active_duration_sec: 1800,
        total_duration_sec: 2400,
        steps_completed: 5,
        screens_viewed: 12,
      };
      expect(params.active_duration_sec).toBe(1800);
      expect(params.screens_viewed).toBe(12);
    });
  });

  describe('UserProperties', () => {
    it('should accept all optional properties', () => {
      const props: UserProperties = {
        user_tier: 'premium',
        signup_method: 'google',
        courses_created_count: 10,
        total_steps_completed: 150,
        avg_quiz_score: 'high',
        days_since_signup: 90,
        last_active_date: '2024-01-15',
      };
      expect(props.user_tier).toBe('premium');
    });

    it('should work with partial properties', () => {
      const props: UserProperties = {
        user_tier: 'free',
      };
      expect(props.courses_created_count).toBeUndefined();
    });
  });
});

describe('EventNames', () => {
  it('should have all required event names', () => {
    const expectedNames = [
      'SIGN_UP',
      'LOGIN',
      'LOGOUT',
      'ONBOARDING_START',
      'GOAL_SELECTED',
      'ONBOARDING_COMPLETE',
      'LEARNING_COURSE_CREATED',
      'LEARNING_COURSE_OPENED',
      'LEARNING_COURSE_DELETED',
      'STEP_STARTED',
      'STEP_COMPLETED',
      'LESSON_COMPLETED',
      'PRACTICE_COMPLETED',
      'QUIZ_STARTED',
      'QUIZ_QUESTION_ANSWERED',
      'QUIZ_COMPLETED',
      'NEXT_STEP_REQUESTED',
      'NEXT_STEP_GENERATED',
      'AI_ERROR',
      'APP_OPEN',
      'SESSION_START',
      'SESSION_END',
      'THEME_CHANGED',
      'PROGRESS_VIEWED',
      'DELETE_ACCOUNT_INITIATED',
      'SCREEN_VIEW',
    ];

    for (const name of expectedNames) {
      expect(EventNames).toHaveProperty(name);
    }
  });

  it('should use snake_case for event values', () => {
    expect(EventNames.SIGN_UP).toBe('sign_up');
    expect(EventNames.LEARNING_COURSE_CREATED).toBe('learning_path_created');
    expect(EventNames.QUIZ_QUESTION_ANSWERED).toBe('quiz_question_answered');
  });
});

describe('ScreenNames', () => {
  it('should have all required screen names', () => {
    const expectedNames = [
      'LANDING',
      'LOGIN',
      'GOAL_SELECTION',
      'LEVEL_SELECTION',
      'HOME',
      'LEARNING_PATH',
      'STEP_DETAIL',
      'LESSON',
      'QUIZ',
      'PRACTICE',
      'PROGRESS',
      'SETTINGS',
    ];

    for (const name of expectedNames) {
      expect(ScreenNames).toHaveProperty(name);
    }
  });

  it('should use PascalCase for screen values', () => {
    expect(ScreenNames.LANDING).toBe('Landing');
    expect(ScreenNames.GOAL_SELECTION).toBe('GoalSelection');
    expect(ScreenNames.LEARNING_PATH).toBe('Course');
  });
});

describe('AnalyticsEvent Union Type', () => {
  it('should accept valid event structures', () => {
    const signUpEvent: AnalyticsEvent = {
      name: 'sign_up',
      params: { method: 'google' },
    };

    const loginEvent: AnalyticsEvent = {
      name: 'login',
      params: { method: 'email' },
    };

    const pathCreatedEvent: AnalyticsEvent = {
      name: 'learning_path_created',
      params: {
        path_id: 'p1',
        goal: 'Learn Go',
        is_first_path: true,
      },
    };

    expect(signUpEvent.name).toBe('sign_up');
    expect(loginEvent.params.method).toBe('email');
    expect((pathCreatedEvent.params as CourseCreatedParams).goal).toBe('Learn Go');
  });
});
