/**
 * Analytics Service
 *
 * Unified analytics service for Firebase Analytics.
 * Handles event tracking, user properties, and screen views.
 *
 * Features:
 * - Type-safe event logging
 * - Offline queue with automatic sync
 * - Active time tracking
 * - Debug mode for development
 */

import { Platform } from 'react-native';
import { offlineQueue } from './offlineQueue';
import type {
  AnalyticsEvent,
  UserProperties,
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
} from './events';
import { EventNames } from './events';

// =============================================================================
// Types
// =============================================================================

interface AnalyticsConfig {
  enabled: boolean;
  debugMode: boolean;
  offlineQueueEnabled: boolean;
}

interface SessionData {
  startTime: number;
  activeTime: number;
  lastActiveTime: number;
  stepsCompleted: number;
  screensViewed: Set<string>;
  isActive: boolean;
}

// =============================================================================
// Analytics Service Class
// =============================================================================

class AnalyticsService {
  private config: AnalyticsConfig = {
    enabled: true,
    debugMode: __DEV__,
    offlineQueueEnabled: true,
  };

  private isInitialized = false;
  private userId: string | null = null;
  private sessionData: SessionData = this.createNewSession();

  // Firebase Analytics instance (lazy loaded)
  private firebaseAnalytics: {
    logEvent: (name: string, params?: Record<string, unknown>) => void;
    setUserId: (id: string | null) => void;
    setUserProperties: (props: Record<string, string | null>) => void;
    setCurrentScreen: (screenName: string, screenClass: string) => void;
  } | null = null;

  /**
   * Initialize the analytics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize offline queue
      await offlineQueue.initialize();

      // Set up batch sender for offline queue
      offlineQueue.setSendBatch(async (events) => {
        for (const event of events) {
          await this.sendEvent(event.event_name, event.params);
        }
        return true;
      });

      // Try to load Firebase Analytics
      await this.loadFirebaseAnalytics();

      // Sync any queued events
      if (this.config.offlineQueueEnabled) {
        await offlineQueue.sync();
      }

      this.isInitialized = true;
      this.log('Analytics initialized');
    } catch (error) {
      console.warn('[Analytics] Initialization failed:', error);
      this.isInitialized = true; // Continue without Firebase
    }
  }

  /**
   * Load Firebase Analytics (platform-specific)
   */
  private async loadFirebaseAnalytics(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase JS SDK
        // This will be available if Firebase is configured in the project
        // For now, we'll use a mock that logs to console in development
        this.firebaseAnalytics = this.createWebAnalytics();
      } else {
        // Native: For now, use console logging
        // TODO: Add @react-native-firebase/analytics with expo-dev-client
        this.firebaseAnalytics = this.createMockAnalytics();
      }
    } catch (error) {
      this.log('Firebase Analytics not available, using mock');
      this.firebaseAnalytics = this.createMockAnalytics();
    }
  }

  /**
   * Create web analytics adapter
   */
  private createWebAnalytics() {
    // In production, this would use Firebase JS SDK
    // For now, return mock that can be replaced with real implementation
    return this.createMockAnalytics();
  }

  /**
   * Create mock analytics for development/fallback
   */
  private createMockAnalytics() {
    return {
      logEvent: (name: string, params?: Record<string, unknown>) => {
        if (this.config.debugMode) {
          console.log(`[Analytics] Event: ${name}`, params);
        }
      },
      setUserId: (id: string | null) => {
        if (this.config.debugMode) {
          console.log(`[Analytics] User ID: ${id}`);
        }
      },
      setUserProperties: (props: Record<string, string | null>) => {
        if (this.config.debugMode) {
          console.log('[Analytics] User Properties:', props);
        }
      },
      setCurrentScreen: (screenName: string, screenClass: string) => {
        if (this.config.debugMode) {
          console.log(`[Analytics] Screen: ${screenName} (${screenClass})`);
        }
      },
    };
  }

  /**
   * Create a new session data object
   */
  private createNewSession(): SessionData {
    return {
      startTime: Date.now(),
      activeTime: 0,
      lastActiveTime: Date.now(),
      stepsCompleted: 0,
      screensViewed: new Set(),
      isActive: true,
    };
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.log(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(debug: boolean): void {
    this.config.debugMode = debug;
  }

  // ===========================================================================
  // User Management
  // ===========================================================================

  /**
   * Set the current user ID
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
    this.firebaseAnalytics?.setUserId(userId);
    this.log(`User ID set: ${userId}`);
  }

  /**
   * Set user properties for segmentation
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.config.enabled) return;

    const stringProps: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(properties)) {
      stringProps[key] = value !== undefined ? String(value) : null;
    }

    this.firebaseAnalytics?.setUserProperties(stringProps);
    this.log('User properties set:', stringProps);
  }

  // ===========================================================================
  // Event Tracking
  // ===========================================================================

  /**
   * Log an analytics event (type-safe)
   */
  async logEvent<T extends AnalyticsEvent>(
    event: T['name'],
    params: T['params']
  ): Promise<void> {
    if (!this.config.enabled) return;

    await this.ensureInitialized();

    // Add common properties
    const enrichedParams: Record<string, unknown> = {
      ...params,
      platform: Platform.OS,
      timestamp: Date.now(),
    };

    // Send or queue the event
    try {
      await this.sendEvent(event, enrichedParams);
    } catch {
      // Queue for later if sending fails
      if (this.config.offlineQueueEnabled) {
        await offlineQueue.enqueue(event, enrichedParams);
        this.log(`Event queued: ${event}`);
      }
    }
  }

  /**
   * Send event to Firebase
   */
  private async sendEvent(
    name: string,
    params: Record<string, unknown>
  ): Promise<void> {
    this.firebaseAnalytics?.logEvent(name, params);
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ===========================================================================
  // Screen Tracking
  // ===========================================================================

  /**
   * Track screen view
   */
  async trackScreen(screenName: string, screenClass: string): Promise<void> {
    this.sessionData.screensViewed.add(screenName);
    this.firebaseAnalytics?.setCurrentScreen(screenName, screenClass);

    await this.logEvent<{ name: 'screen_view'; params: ScreenViewParams }>(
      EventNames.SCREEN_VIEW,
      {
        screen_name: screenName,
        screen_class: screenClass,
      }
    );
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * Start a new session
   */
  async startSession(): Promise<void> {
    this.sessionData = this.createNewSession();

    await this.logEvent<{ name: 'session_start'; params: SessionStartParams }>(
      EventNames.SESSION_START,
      {
        platform: Platform.OS,
        app_version: '1.0.0', // TODO: Get from app config
      }
    );
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    const now = Date.now();
    const totalDuration = Math.floor((now - this.sessionData.startTime) / 1000);
    const activeDuration = Math.floor(this.sessionData.activeTime / 1000);

    await this.logEvent<{ name: 'session_end'; params: SessionEndParams }>(
      EventNames.SESSION_END,
      {
        active_duration_sec: activeDuration,
        total_duration_sec: totalDuration,
        steps_completed: this.sessionData.stepsCompleted,
        screens_viewed: this.sessionData.screensViewed.size,
      }
    );
  }

  /**
   * Mark user as active (for active time tracking)
   */
  markActive(): void {
    const now = Date.now();
    if (!this.sessionData.isActive) {
      this.sessionData.isActive = true;
      this.sessionData.lastActiveTime = now;
    }
  }

  /**
   * Mark user as inactive
   */
  markInactive(): void {
    if (this.sessionData.isActive) {
      const now = Date.now();
      this.sessionData.activeTime += now - this.sessionData.lastActiveTime;
      this.sessionData.isActive = false;
    }
  }

  /**
   * Get current active time in seconds
   */
  getActiveTime(): number {
    let total = this.sessionData.activeTime;
    if (this.sessionData.isActive) {
      total += Date.now() - this.sessionData.lastActiveTime;
    }
    return Math.floor(total / 1000);
  }

  /**
   * Increment steps completed in session
   */
  incrementStepsCompleted(): void {
    this.sessionData.stepsCompleted++;
  }

  // ===========================================================================
  // Convenience Methods (Tier 1 Events)
  // ===========================================================================

  // Auth Events
  async trackSignUp(params: SignUpParams): Promise<void> {
    await this.logEvent(EventNames.SIGN_UP, params);
  }

  async trackLogin(params: LoginParams): Promise<void> {
    await this.logEvent(EventNames.LOGIN, params);
  }

  async trackLogout(params: LogoutParams): Promise<void> {
    await this.logEvent(EventNames.LOGOUT, params);
  }

  // Onboarding Events
  async trackOnboardingStart(params: OnboardingStartParams): Promise<void> {
    await this.logEvent(EventNames.ONBOARDING_START, params);
  }

  async trackGoalSelected(params: GoalSelectedParams): Promise<void> {
    await this.logEvent(EventNames.GOAL_SELECTED, params);
  }

  async trackOnboardingComplete(
    params: OnboardingCompleteParams
  ): Promise<void> {
    await this.logEvent(EventNames.ONBOARDING_COMPLETE, params);
  }

  // Learning Path Events
  async trackCourseCreated(
    params: CourseCreatedParams
  ): Promise<void> {
    await this.logEvent(EventNames.LEARNING_COURSE_CREATED, params);
  }

  async trackCourseOpened(
    params: CourseOpenedParams
  ): Promise<void> {
    await this.logEvent(EventNames.LEARNING_COURSE_OPENED, params);
  }

  async trackCourseDeleted(
    params: CourseDeletedParams
  ): Promise<void> {
    await this.logEvent(EventNames.LEARNING_COURSE_DELETED, params);
  }

  // Step Events
  async trackStepStarted(params: StepStartedParams): Promise<void> {
    await this.logEvent(EventNames.STEP_STARTED, params);
  }

  async trackStepCompleted(params: StepCompletedParams): Promise<void> {
    this.incrementStepsCompleted();
    await this.logEvent(EventNames.STEP_COMPLETED, params);
  }

  async trackLessonCompleted(params: LessonCompletedParams): Promise<void> {
    await this.logEvent(EventNames.LESSON_COMPLETED, params);
  }

  async trackPracticeCompleted(params: PracticeCompletedParams): Promise<void> {
    await this.logEvent(EventNames.PRACTICE_COMPLETED, params);
  }

  // Quiz Events
  async trackQuizStarted(params: QuizStartedParams): Promise<void> {
    await this.logEvent(EventNames.QUIZ_STARTED, params);
  }

  async trackQuizQuestionAnswered(
    params: QuizQuestionAnsweredParams
  ): Promise<void> {
    await this.logEvent(EventNames.QUIZ_QUESTION_ANSWERED, params);
  }

  async trackQuizCompleted(params: QuizCompletedParams): Promise<void> {
    await this.logEvent(EventNames.QUIZ_COMPLETED, params);
  }

  // AI Events
  async trackNextStepRequested(params: NextStepRequestedParams): Promise<void> {
    await this.logEvent(EventNames.NEXT_STEP_REQUESTED, params);
  }

  async trackNextStepGenerated(params: NextStepGeneratedParams): Promise<void> {
    await this.logEvent(EventNames.NEXT_STEP_GENERATED, params);
  }

  async trackAIError(params: AIErrorParams): Promise<void> {
    await this.logEvent(EventNames.AI_ERROR, params);
  }

  // Session Events
  async trackAppOpen(params: AppOpenParams): Promise<void> {
    await this.logEvent(EventNames.APP_OPEN, params);
  }

  // Settings Events
  async trackThemeChanged(params: ThemeChangedParams): Promise<void> {
    await this.logEvent(EventNames.THEME_CHANGED, params);
  }

  async trackProgressViewed(params: ProgressViewedParams): Promise<void> {
    await this.logEvent(EventNames.PROGRESS_VIEWED, params);
  }

  async trackDeleteAccountInitiated(
    params: DeleteAccountInitiatedParams
  ): Promise<void> {
    await this.logEvent(EventNames.DELETE_ACCOUNT_INITIATED, params);
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Sync offline queue
   */
  async syncOfflineEvents(): Promise<number> {
    if (!this.config.offlineQueueEnabled) return 0;
    return offlineQueue.sync();
  }

  /**
   * Get offline queue size
   */
  getOfflineQueueSize(): number {
    return offlineQueue.getQueueSize();
  }

  /**
   * Log debug message
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debugMode) {
      if (data) {
        console.log(`[Analytics] ${message}`, data);
      } else {
        console.log(`[Analytics] ${message}`);
      }
    }
  }
}

// =============================================================================
// Export Singleton Instance
// =============================================================================

export const analytics = new AnalyticsService();
