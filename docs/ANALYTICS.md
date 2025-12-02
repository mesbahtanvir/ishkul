# Analytics Strategy - Ishkul

> **Status**: Work in Progress
> **Last Updated**: 2024-12-02
> **Phase**: Planning → Implementation

## Overview

Comprehensive analytics implementation using a combination approach:

| Phase | Tool | Purpose | Status |
|-------|------|---------|--------|
| 1 | **Firebase Analytics** | Basic events, crashes, screen views | 🔄 Planning |
| 2 | Mixpanel / Amplitude | Deep behavioral analysis, cohorts | 📋 Future |
| 3 | Sentry | Error tracking with context | 📋 Future |

---

## Phase 1: Firebase Analytics (Current Focus)

### Tier 1 Events (Launch Priority)

#### Authentication Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `sign_up` | Registration complete | `method`: google \| email |
| `login` | Login complete | `method`: google \| email |
| `logout` | User logs out | `session_duration_sec` |

#### Onboarding Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `onboarding_start` | User lands on goal selection | `is_new_user`: boolean |
| `goal_selected` | Goal chosen | `goal`: string |
| `level_selected` | Level chosen | `level`: beginner \| intermediate \| advanced |
| `onboarding_complete` | First path created | `goal`, `level`, `duration_sec` |

#### Learning Path Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `learning_path_created` | New path created | `path_id`, `goal`, `level`, `is_first_path` |
| `learning_path_opened` | Path screen viewed | `path_id`, `goal`, `progress`, `steps_count` |
| `learning_path_deleted` | Path deleted | `path_id`, `progress_at_deletion`, `steps_completed` |

#### Step Events (Core Learning)

| Event | Trigger | Properties |
|-------|---------|------------|
| `step_started` | User opens any step | `path_id`, `step_id`, `step_type`, `topic`, `step_index` |
| `step_completed` | User finishes step | `path_id`, `step_id`, `step_type`, `topic`, `duration_sec`, `score` |
| `lesson_completed` | Lesson marked done | `path_id`, `step_id`, `topic`, `active_time_sec` |
| `practice_completed` | Practice marked done | `path_id`, `step_id`, `topic`, `active_time_sec`, `hints_used` |

#### Quiz Events (Per Question Tracking)

| Event | Trigger | Properties |
|-------|---------|------------|
| `quiz_started` | Quiz screen opened | `path_id`, `step_id`, `topic` |
| `quiz_question_answered` | Each answer submitted | `path_id`, `step_id`, `topic`, `is_correct`, `answer_time_sec` |
| `quiz_completed` | Quiz finished | `path_id`, `step_id`, `topic`, `score`, `total_time_sec`, `active_time_sec` |

#### AI Performance Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `next_step_requested` | User requests next step | `path_id`, `current_progress` |
| `next_step_generated` | AI returns step | `path_id`, `step_type`, `topic`, `response_time_ms`, `model_used` |
| `ai_error` | AI generation fails | `path_id`, `error_type`, `retry_count` |

#### Session Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `app_open` | App launched | `days_since_last_session`, `is_first_open` |
| `session_start` | User becomes active | `platform`, `app_version` |
| `session_end` | App backgrounded/closed | `active_duration_sec`, `total_duration_sec`, `steps_completed`, `screens_viewed` |

#### Screen Views (Automatic)

Firebase automatically tracks `screen_view` events. Ensure each screen has:
- `screen_name`: Human-readable name
- `screen_class`: Component name

| Screen | screen_name | screen_class |
|--------|-------------|--------------|
| Landing | `"Landing"` | `"LandingScreen"` |
| Login | `"Login"` | `"LoginScreen"` |
| Home | `"Home"` | `"HomeScreen"` |
| Learning Path | `"Learning Path"` | `"LearningPathScreen"` |
| Lesson | `"Lesson"` | `"LessonScreen"` |
| Quiz | `"Quiz"` | `"QuizScreen"` |
| Practice | `"Practice"` | `"PracticeScreen"` |
| Progress | `"Progress"` | `"ProgressScreen"` |
| Settings | `"Settings"` | `"SettingsScreen"` |

---

### Tier 2 Events (Post-Launch)

| Event | Trigger | Properties |
|-------|---------|------------|
| `step_reviewed` | Views completed step | `step_id`, `days_since_completion` |
| `progress_viewed` | Opens Progress tab | `total_completed`, `avg_score`, `topics_mastered` |
| `path_resumed` | Returns to path | `path_id`, `days_since_last`, `progress` |
| `theme_changed` | Settings toggle | `from_theme`, `to_theme` |
| `hint_viewed` | Practice hint opened | `practice_id`, `hint_index`, `hints_total` |
| `delete_account_initiated` | Clicks delete | `account_age_days`, `paths_count`, `steps_completed` |

---

### Tier 3 Events (Optimization)

| Event | Trigger | Properties |
|-------|---------|------------|
| `content_scroll_depth` | Lesson scrolled | `screen`, `percent_scrolled` |
| `milestone_reached` | Achievement unlocked | `milestone_type`, `path_id` |
| `share_attempted` | Share button clicked | `content_type`, `share_method` |
| `search_performed` | Search used | `query`, `results_count` |
| `feedback_submitted` | Feedback sent | `rating`, `has_comment` |

---

## User Properties

Persistent properties for segmentation:

| Property | When Set | Values | Purpose |
|----------|----------|--------|---------|
| `user_tier` | Auth/Upgrade | `free`, `premium` | Revenue segmentation |
| `signup_method` | Registration | `google`, `email` | Acquisition analysis |
| `paths_created_count` | Path creation | `1`, `2-3`, `4+` | Engagement level |
| `total_steps_completed` | Step completion | `0-10`, `11-50`, `51-100`, `100+` | User maturity |
| `avg_quiz_score` | Quiz completion | `low` (<60), `medium` (60-80), `high` (>80) | Performance tier |
| `preferred_level` | Most used | `beginner`, `intermediate`, `advanced` | Content preference |
| `days_since_signup` | Session start | Calculated | Lifecycle stage |
| `last_active_date` | Session end | ISO date | Recency |

---

## Topic Performance Tracking

Track learning outcomes by topic to identify content issues:

```typescript
interface TopicPerformance {
  topic: string;
  total_attempts: number;
  correct_attempts: number;
  avg_score: number;
  avg_time_sec: number;
  completion_rate: number;
}
```

Events for topic analysis:
- `quiz_question_answered` with `topic` property
- `step_completed` with `topic` and `score`
- Aggregate in BigQuery for topic performance dashboards

---

## Active Time Tracking

Track actual engagement, not just elapsed time:

### Implementation Approach

```typescript
// Track user activity signals
const activitySignals = [
  'touch',      // Screen touches
  'scroll',     // Content scrolling
  'keypress',   // Text input
  'focus',      // Screen focus
];

// Pause tracking when:
// - App backgrounded
// - Screen locked
// - No activity for 30 seconds (idle threshold)
```

### Properties

| Property | Description |
|----------|-------------|
| `active_time_sec` | Time user was actively engaged |
| `total_time_sec` | Total elapsed time (including idle) |
| `idle_time_sec` | Time with no activity |
| `engagement_ratio` | active_time / total_time |

---

## Offline Behavior

Queue events when offline, send when connection restored:

### Strategy

1. **Detect connectivity**: Use `NetInfo` from React Native
2. **Queue events locally**: Store in AsyncStorage
3. **Batch send on reconnect**: Max 500 events per batch
4. **Retry logic**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
5. **TTL**: Discard events older than 7 days

### Implementation Notes

```typescript
interface QueuedEvent {
  event_name: string;
  params: Record<string, any>;
  timestamp: number;        // When event occurred
  queued_at: number;        // When added to queue
  retry_count: number;
}
```

Firebase Analytics handles offline automatically, but custom events need:
- Local queue with AsyncStorage
- Sync on `NetInfo` connectivity change
- Background sync with `expo-background-fetch` (optional)

---

## Key Funnels

### Funnel 1: Onboarding Conversion

```
Landing Screen View
    ↓ (Target: 80%)
sign_up
    ↓ (Target: 90%)
goal_selected
    ↓ (Target: 95%)
level_selected
    ↓ (Target: 85%)
first_step_completed
```

**Success Metric**: >60% from landing to first step

### Funnel 2: Daily Learning Session

```
app_open (returning user)
    ↓ (Target: 70%)
learning_path_opened
    ↓ (Target: 80%)
step_started
    ↓ (Target: 85%)
step_completed
    ↓ (Target: 50%)
second_step_completed
```

**Success Metric**: 3+ steps per session average

### Funnel 3: Quiz Engagement

```
quiz_started
    ↓ (Target: 95%)
quiz_question_answered (first)
    ↓ (Target: 90%)
quiz_completed
```

**Success Metric**: >85% quiz completion rate

### Funnel 4: Retention

```
Day 0: sign_up
    ↓ (Target: 40%)
Day 1: app_open
    ↓ (Target: 30%)
Day 7: app_open
    ↓ (Target: 20%)
Day 30: app_open
```

**Success Metric**: D7 retention >25%

---

## Key Metrics to Monitor

### Engagement Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| DAU | Unique users with `session_start` today | Growth |
| WAU | Unique users with `session_start` this week | Growth |
| DAU/MAU | DAU ÷ MAU | >20% |
| Avg Session Duration | Mean `active_duration_sec` | >5 min |
| Steps per Session | Mean `steps_completed` per session | >3 |

### Learning Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Quiz Accuracy | `correct_answers` ÷ `total_answers` | >70% |
| Avg Quiz Score | Mean `score` from `quiz_completed` | >75 |
| Completion Rate | `step_completed` ÷ `step_started` | >80% |
| Topic Mastery | Topics with avg score >80% | Growth |

### Performance Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| AI Response Time | Mean `response_time_ms` from `next_step_generated` | <3000ms |
| AI Error Rate | `ai_error` ÷ `next_step_requested` | <2% |
| App Crash Rate | Crashes ÷ sessions | <1% |

### Retention Metrics

| Metric | Target |
|--------|--------|
| D1 Retention | >40% |
| D7 Retention | >25% |
| D30 Retention | >15% |

---

## Implementation Files

### Frontend (to create)

```
frontend/src/services/analytics/
├── index.ts                 # Main export
├── analyticsService.ts      # Core analytics service
├── events.ts                # Event type definitions
├── activeTimeTracker.ts     # Active time tracking
├── offlineQueue.ts          # Offline event queue
└── constants.ts             # Event names, property keys
```

### Hooks (to create)

```
frontend/src/hooks/
├── useAnalytics.ts          # Main analytics hook
├── useActiveTime.ts         # Track active time per screen
└── useScreenTracking.ts     # Automatic screen view tracking
```

### Backend (to create)

```
backend/internal/analytics/
├── events.go                # Event definitions
├── logger.go                # Server-side event logging
└── metrics.go               # Aggregated metrics
```

---

## Phase 2: Mixpanel / Amplitude (Future)

### When to Add

- After Firebase baseline established
- When need advanced cohort analysis
- When need retention curves
- When need A/B testing insights

### Key Features to Use

- Cohort analysis
- Retention curves
- User journey mapping
- Funnel conversion analysis
- A/B test result analysis

---

## Phase 3: Sentry (Future)

### When to Add

- When need detailed error context
- When debugging production issues
- When need session replay

### Key Features to Use

- Error tracking with stack traces
- Session replay
- Performance monitoring
- Release health tracking

---

## Privacy Considerations

### Data We Track

- User behavior (anonymous events)
- Learning performance (scores, completion)
- App usage patterns

### Data We DON'T Track

- Personal content within lessons
- Exact user answers (only correct/incorrect)
- Location data
- Device identifiers beyond Firebase defaults

### Compliance

- [ ] Add analytics disclosure to privacy policy
- [ ] Implement analytics opt-out in settings (if required)
- [ ] Document data retention policy

---

## Next Steps

1. [ ] **Setup Firebase Analytics** in React Native app
2. [ ] **Create analytics service** with type-safe event logging
3. [ ] **Implement Tier 1 events** across all screens
4. [ ] **Add active time tracking** hook
5. [ ] **Implement offline queue** for event reliability
6. [ ] **Set up Firebase dashboards** for key metrics
7. [ ] **Configure BigQuery export** for advanced analysis
8. [ ] **Add automated alerts** for anomaly detection

---

## Appendix: Event Schema (TypeScript)

```typescript
// frontend/src/services/analytics/events.ts

// Step types
type StepType = 'lesson' | 'quiz' | 'practice' | 'review' | 'summary';
type AuthMethod = 'google' | 'email';
type Level = 'beginner' | 'intermediate' | 'advanced';

// Event definitions
export type AnalyticsEvent =
  // Authentication
  | { name: 'sign_up'; params: { method: AuthMethod } }
  | { name: 'login'; params: { method: AuthMethod } }
  | { name: 'logout'; params: { session_duration_sec: number } }

  // Onboarding
  | { name: 'onboarding_start'; params: { is_new_user: boolean } }
  | { name: 'goal_selected'; params: { goal: string } }
  | { name: 'level_selected'; params: { level: Level } }
  | { name: 'onboarding_complete'; params: { goal: string; level: Level; duration_sec: number } }

  // Learning Path
  | { name: 'learning_path_created'; params: { path_id: string; goal: string; level: Level; is_first_path: boolean } }
  | { name: 'learning_path_opened'; params: { path_id: string; goal: string; progress: number; steps_count: number } }
  | { name: 'learning_path_deleted'; params: { path_id: string; progress_at_deletion: number; steps_completed: number } }

  // Steps
  | { name: 'step_started'; params: { path_id: string; step_id: string; step_type: StepType; topic: string; step_index: number } }
  | { name: 'step_completed'; params: { path_id: string; step_id: string; step_type: StepType; topic: string; duration_sec: number; active_time_sec: number; score?: number } }
  | { name: 'lesson_completed'; params: { path_id: string; step_id: string; topic: string; active_time_sec: number } }
  | { name: 'practice_completed'; params: { path_id: string; step_id: string; topic: string; active_time_sec: number; hints_used: number } }

  // Quiz (per question)
  | { name: 'quiz_started'; params: { path_id: string; step_id: string; topic: string } }
  | { name: 'quiz_question_answered'; params: { path_id: string; step_id: string; topic: string; is_correct: boolean; answer_time_sec: number } }
  | { name: 'quiz_completed'; params: { path_id: string; step_id: string; topic: string; score: number; total_time_sec: number; active_time_sec: number } }

  // AI Performance
  | { name: 'next_step_requested'; params: { path_id: string; current_progress: number } }
  | { name: 'next_step_generated'; params: { path_id: string; step_type: StepType; topic: string; response_time_ms: number; model_used: string } }
  | { name: 'ai_error'; params: { path_id: string; error_type: string; retry_count: number } }

  // Session
  | { name: 'app_open'; params: { days_since_last_session: number; is_first_open: boolean } }
  | { name: 'session_start'; params: { platform: string; app_version: string } }
  | { name: 'session_end'; params: { active_duration_sec: number; total_duration_sec: number; steps_completed: number; screens_viewed: number } }

  // Settings
  | { name: 'theme_changed'; params: { from_theme: string; to_theme: string } }
  | { name: 'progress_viewed'; params: { total_completed: number; avg_score: number; topics_mastered: number } }
  | { name: 'delete_account_initiated'; params: { account_age_days: number; paths_count: number; steps_completed: number } };

// User properties
export interface UserProperties {
  user_tier: 'free' | 'premium';
  signup_method: AuthMethod;
  paths_created_count: number;
  total_steps_completed: number;
  avg_quiz_score: 'low' | 'medium' | 'high';
  preferred_level: Level;
  days_since_signup: number;
  last_active_date: string;
}
```

---

**Document Version**: 1.0
**Author**: Claude Code
**Review Status**: Draft - Awaiting Implementation
