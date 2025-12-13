# PRD: Course Generation Optimization

**Version**: 2.0.0
**Status**: Refined
**Author**: Claude
**Date**: 2024-12-13
**Reviewers**: @mesbahtanvir

---

## Executive Summary

Optimize course content generation to eliminate user-perceived lag by implementing:
1. **Firestore-based priority queue** with distributed worker claims
2. **Block-based look-ahead pre-generation** (not lesson-based)
3. **Offline-first architecture** with server-wins conflict resolution
4. **Smart diff cache invalidation** (only regenerate affected blocks)
5. **Per-user rate limiting** with 1M tokens/day cap
6. **Comprehensive metrics** for monitoring dashboards

---

## Problem Statement

Users experience frustrating 2-5 second waits when viewing course content because:
- Block content is generated on-demand (synchronous LLM calls)
- Pre-generation only covers the first lesson
- No offline support (content lost on refresh)
- No visibility into generation pipeline health

**Business Impact**: Users abandon courses due to wait times, reducing engagement and retention.

---

## Goals & Success Metrics

| Goal | Metric | Current | Target |
|------|--------|---------|--------|
| Eliminate wait time | Block load time (p95) | 3-5s | < 500ms |
| Pre-generation effectiveness | Cache hit rate | ~10% | > 90% |
| System health visibility | Dashboard metrics | None | Full coverage |
| Cost control | Token usage tracking | None | 1M/user/day cap |
| Offline capability | Content available offline | 0% | 100% viewed content |

---

## Non-Goals

- Real-time collaborative editing
- Custom LLM model training
- Data migration (fresh start with new structure)
- Backward compatibility

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Queue architecture | Firestore-only | Handles multi-instance coordination naturally |
| Multi-instance coordination | Firestore claims with transactions | No leader election needed |
| Real-time updates | Firestore listeners | Best UX, acceptable cost |
| Token limit reset | Daily UTC midnight | Simple, clear expectation |
| Cache invalidation | Hybrid smart diff | Only regenerate affected blocks |
| Offline conflicts | Server wins | Simple, no user prompts |
| Look-ahead granularity | Block-based | More granular than lessons |
| Backpressure | Per-user rate limit | Fair resource distribution |
| Retry strategy | Exponential backoff | Prevents thundering herd |
| Migration | None needed | Fresh start |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 SYSTEM ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         GO SERVICE (Multiple Instances)                       │   │
│  │                                                                               │   │
│  │  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │   API       │  │   Queue Worker      │  │   Background Scheduler      │   │   │
│  │  │   Handlers  │  │   (Claims jobs via  │  │   (Periodic tasks)          │   │   │
│  │  │             │  │    Firestore tx)    │  │   - Pregeneration           │   │   │
│  │  └─────────────┘  └─────────────────────┘  │   - Cleanup orphans         │   │   │
│  │         │                   │              │   - Persist metrics         │   │   │
│  │         │                   │              └─────────────────────────────┘   │   │
│  │         │                   │                           │                    │   │
│  │         └───────────────────┴───────────────────────────┘                    │   │
│  │                                     │                                         │   │
│  │                          ┌──────────┴──────────┐                             │   │
│  │                          │                     │                             │   │
│  │                          ▼                     ▼                             │   │
│  │              ┌─────────────────┐    ┌─────────────────┐                      │   │
│  │              │   LLM Router    │    │   Metrics       │                      │   │
│  │              │ (OpenAI/DeepSeek)    │   Service       │                      │   │
│  │              └─────────────────┘    └─────────────────┘                      │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         FIRESTORE (Source of Truth)                           │   │
│  │                                                                               │   │
│  │   courses/{courseId}/              generationJobs/                            │   │
│  │     ├── metadata                     └── {jobId}                              │   │
│  │     ├── outline                           ├── status: queued|processing|...  │   │
│  │     └── blocks/{blockId}                  ├── claimedBy: instanceId|null     │   │
│  │                                           ├── claimedAt: timestamp           │   │
│  │   users/{userId}/                         └── priority, attempts, etc.       │   │
│  │     └── tokenUsage/{date}                                                    │   │
│  │                                    metrics/                                   │   │
│  │   userRateLimits/{userId}            ├── realtime                            │   │
│  │     └── jobsInFlight: number         └── daily/{date}                        │   │
│  │                                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                              FRONTEND                                         │   │
│  │                                                                               │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │   │ Firestore   │  │ Offline     │  │ Zustand     │  │ Skeleton UI         │ │   │
│  │   │ Listeners   │──│ Storage     │──│ Stores      │──│ + Loading States    │ │   │
│  │   │ (Real-time) │  │ (AsyncStorage)│ │ (Persist)   │  │                     │ │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  │                                                                               │   │
│  │   Conflict Resolution: Server Wins (discard stale local data)                │   │
│  │                                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. Data Model

#### 1.1 Course Structure (Firestore)

```
courses/{courseId}/
  ├── metadata (document)
  │     ├── id: string
  │     ├── userId: string
  │     ├── title: string
  │     ├── emoji: string
  │     ├── goal: string                    // Original user goal
  │     ├── status: "active" | "completed" | "archived" | "deleted"
  │     ├── outlineStatus: "generating" | "ready" | "failed"
  │     ├── progress: number (0-100)
  │     ├── currentPosition: { sectionIndex, lessonIndex, blockIndex }
  │     ├── totalBlocks: number
  │     ├── readyBlocks: number
  │     ├── createdAt, updatedAt, lastAccessedAt: timestamp
  │     └── version: number                 // Incremented on goal/structure change
  │
  ├── outline (document)
  │     ├── title: string
  │     ├── description: string
  │     ├── estimatedMinutes: number
  │     ├── difficulty: "beginner" | "intermediate" | "advanced"
  │     ├── category: string
  │     ├── tags: string[]
  │     ├── learningOutcomes: string[]
  │     └── sections: Section[]             // Structure only, no block content
  │           ├── id, title, description
  │           ├── order: number
  │           └── lessons: Lesson[]
  │                 ├── id, title, description
  │                 ├── order: number
  │                 └── blockIds: string[]  // References to blocks subcollection
  │
  └── blocks/ (subcollection)
        └── {blockId} (document)
              ├── id: string
              ├── courseId: string
              ├── sectionId: string
              ├── lessonId: string
              ├── type: "text" | "code" | "question" | "task" | "flashcard" | "summary"
              ├── title: string
              ├── purpose: string
              ├── order: number
              ├── contentStatus: "pending" | "queued" | "generating" | "ready" | "error"
              ├── content: BlockContent | null
              ├── error: string | null
              ├── generatedAt: timestamp | null
              ├── generationDuration: number (ms)
              ├── tokensUsed: { input, output, model }
              └── version: number
```

#### 1.2 Generation Queue (Firestore-based)

```
generationJobs/{jobId}/
  ├── id: string
  ├── courseId: string
  ├── userId: string
  ├── blockId: string
  ├── sectionId: string
  ├── lessonId: string
  │
  │ // Priority & Scheduling
  ├── priority: 1 | 2 | 3 | 4
  │     // 1 = Immediate (user waiting)
  │     // 2 = Current lesson (other blocks in same lesson)
  │     // 3 = Look-ahead (next N blocks)
  │     // 4 = Background (cache invalidation, pregeneration)
  ├── scheduledFor: timestamp              // For delayed retry
  │
  │ // Status & Claims (for distributed workers)
  ├── status: "queued" | "claimed" | "processing" | "completed" | "failed"
  ├── claimedBy: string | null             // Instance ID that claimed this job
  ├── claimedAt: timestamp | null
  │
  │ // Retry & Error Handling
  ├── attempts: number
  ├── maxAttempts: 3
  ├── lastError: string | null
  ├── nextRetryAt: timestamp | null        // Exponential backoff
  │
  │ // Timing
  ├── createdAt: timestamp
  ├── startedAt: timestamp | null
  ├── completedAt: timestamp | null
  ├── processingDuration: number (ms)
  │
  │ // Token Usage
  └── tokensUsed: { input, output, model }
```

#### 1.3 Per-User Rate Limiting

```
userRateLimits/{userId}/
  ├── jobsInFlight: number                 // Currently processing jobs
  ├── maxJobsInFlight: 10                  // Per-user concurrency limit
  ├── jobsQueuedToday: number              // Jobs queued today
  ├── maxJobsPerDay: 500                   // Prevent abuse
  └── lastUpdated: timestamp

users/{userId}/tokenUsage/{date}/          // format: "2024-12-13"
  ├── date: string
  ├── inputTokens: number
  ├── outputTokens: number
  ├── totalTokens: number
  ├── limit: 1_000_000                     // 1M tokens/day
  ├── limitExceeded: boolean
  ├── byModel: {
  │     "gpt-4o": { input, output },
  │     "gpt-4o-mini": { input, output },
  │     "deepseek-chat": { input, output }
  │   }
  └── lastUpdated: timestamp
```

#### 1.4 Metrics Collection

```
metrics/
  ├── realtime (single document)
  │     ├── queueDepth: number             // Jobs with status=queued
  │     ├── processingCount: number        // Jobs with status=processing
  │     ├── claimedCount: number           // Jobs with status=claimed
  │     ├── completedLast5Min: number
  │     ├── failedLast5Min: number
  │     ├── avgProcessingTime: number (ms)
  │     ├── p95ProcessingTime: number (ms)
  │     ├── throughputPerMinute: number
  │     ├── errorRate: number (%)
  │     ├── byPriority: { "1": count, "2": count, ... }
  │     └── lastUpdated: timestamp
  │
  └── daily/{date}/
        ├── date: string
        ├── jobsQueued: number
        ├── jobsCompleted: number
        ├── jobsFailed: number
        ├── jobsRetried: number
        ├── avgProcessingTime: number
        ├── p50ProcessingTime: number
        ├── p95ProcessingTime: number
        ├── p99ProcessingTime: number
        ├── totalInputTokens: number
        ├── totalOutputTokens: number
        ├── estimatedCost: number (USD)
        ├── uniqueUsers: number
        ├── byPriority: {
        │     "1": { queued, completed, failed, avgTime, tokens },
        │     "2": { ... }, "3": { ... }, "4": { ... }
        │   }
        ├── byModel: {
        │     "gpt-4o": { jobs, inputTokens, outputTokens, avgTime, cost },
        │     "gpt-4o-mini": { ... },
        │     "deepseek-chat": { ... }
        │   }
        └── hourly: {
              "00": { queued, completed, failed, tokens },
              "01": { ... }, ...
            }
```

---

### 2. Backend Implementation

#### 2.1 Firestore-Based Queue Service

**File**: `backend/internal/services/generation_queue.go`

```go
package services

import (
    "context"
    "errors"
    "time"

    "cloud.google.com/go/firestore"
    "github.com/google/uuid"
)

var (
    ErrTokenLimitExceeded   = errors.New("daily token limit exceeded")
    ErrRateLimitExceeded    = errors.New("per-user rate limit exceeded")
    ErrJobAlreadyExists     = errors.New("job for this block already exists")
    ErrNoJobsAvailable      = errors.New("no jobs available to claim")
)

type Priority int

const (
    PriorityImmediate     Priority = 1  // User actively waiting
    PriorityCurrentLesson Priority = 2  // Other blocks in current lesson
    PriorityLookAhead     Priority = 3  // Next N blocks ahead
    PriorityBackground    Priority = 4  // Cache invalidation, pregeneration
)

const (
    MaxJobsInFlightPerUser = 10
    MaxJobsPerDayPerUser   = 500
    DailyTokenLimit        = 1_000_000
    JobClaimTimeout        = 2 * time.Minute  // If claimed but not processed
)

type GenerationJob struct {
    ID           string    `firestore:"id"`
    CourseID     string    `firestore:"courseId"`
    UserID       string    `firestore:"userId"`
    BlockID      string    `firestore:"blockId"`
    SectionID    string    `firestore:"sectionId"`
    LessonID     string    `firestore:"lessonId"`

    Priority     Priority  `firestore:"priority"`
    ScheduledFor time.Time `firestore:"scheduledFor"`

    Status       string    `firestore:"status"`
    ClaimedBy    string    `firestore:"claimedBy,omitempty"`
    ClaimedAt    *time.Time `firestore:"claimedAt,omitempty"`

    Attempts     int       `firestore:"attempts"`
    MaxAttempts  int       `firestore:"maxAttempts"`
    LastError    string    `firestore:"lastError,omitempty"`
    NextRetryAt  *time.Time `firestore:"nextRetryAt,omitempty"`

    CreatedAt    time.Time  `firestore:"createdAt"`
    StartedAt    *time.Time `firestore:"startedAt,omitempty"`
    CompletedAt  *time.Time `firestore:"completedAt,omitempty"`
    ProcessingDuration int64 `firestore:"processingDuration"`

    TokensUsed   TokenUsage `firestore:"tokensUsed"`
}

type TokenUsage struct {
    Input  int    `firestore:"input" json:"input"`
    Output int    `firestore:"output" json:"output"`
    Model  string `firestore:"model" json:"model"`
}

type GenerationQueueService struct {
    firestoreClient *firestore.Client
    instanceID      string  // Unique ID for this server instance
    metricsService  *MetricsService
}

func NewGenerationQueueService(
    client *firestore.Client,
    metricsService *MetricsService,
) *GenerationQueueService {
    return &GenerationQueueService{
        firestoreClient: client,
        instanceID:      uuid.New().String(),
        metricsService:  metricsService,
    }
}

// Enqueue adds a job to the Firestore queue with deduplication and rate limiting
func (s *GenerationQueueService) Enqueue(ctx context.Context, job *GenerationJob) error {
    // 1. Check if job for this block already exists (deduplication)
    exists, err := s.jobExistsForBlock(ctx, job.BlockID)
    if err != nil {
        return err
    }
    if exists {
        logger.Info(appLogger, ctx, "job_already_exists",
            slog.String("block_id", job.BlockID),
        )
        return nil // Idempotent - not an error
    }

    // 2. Check per-user rate limits
    if err := s.checkUserRateLimits(ctx, job.UserID); err != nil {
        return err
    }

    // 3. Check token limit
    if exceeded, err := s.checkTokenLimit(ctx, job.UserID); err != nil {
        return err
    } else if exceeded {
        logger.Warn(appLogger, ctx, "token_limit_exceeded",
            slog.String("user_id", job.UserID),
        )
        return ErrTokenLimitExceeded
    }

    // 4. Create job document
    job.ID = uuid.New().String()
    job.Status = "queued"
    job.CreatedAt = time.Now()
    job.ScheduledFor = time.Now()
    job.MaxAttempts = 3
    job.Attempts = 0

    // 5. Write to Firestore and increment user's job count (transactionally)
    err = s.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        // Write job
        jobRef := s.firestoreClient.Collection("generationJobs").Doc(job.ID)
        if err := tx.Set(jobRef, job); err != nil {
            return err
        }

        // Increment user's jobs queued today
        rateLimitRef := s.firestoreClient.Collection("userRateLimits").Doc(job.UserID)
        return tx.Update(rateLimitRef, []firestore.Update{
            {Path: "jobsQueuedToday", Value: firestore.Increment(1)},
            {Path: "lastUpdated", Value: time.Now()},
        })
    })

    if err != nil {
        return err
    }

    s.metricsService.RecordJobQueued(job.Priority)

    logger.Info(appLogger, ctx, "job_enqueued",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.String("user_id", job.UserID),
        slog.Int("priority", int(job.Priority)),
    )

    return nil
}

// ClaimNextJob atomically claims the highest priority available job
func (s *GenerationQueueService) ClaimNextJob(ctx context.Context) (*GenerationJob, error) {
    var claimedJob *GenerationJob

    err := s.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        // Query for next available job:
        // - status = "queued"
        // - scheduledFor <= now
        // - ordered by priority ASC, createdAt ASC
        now := time.Now()

        query := s.firestoreClient.Collection("generationJobs").
            Where("status", "==", "queued").
            Where("scheduledFor", "<=", now).
            OrderBy("priority", firestore.Asc).
            OrderBy("createdAt", firestore.Asc).
            Limit(1)

        docs, err := tx.Documents(query).GetAll()
        if err != nil {
            return err
        }

        if len(docs) == 0 {
            return ErrNoJobsAvailable
        }

        // Claim the job
        doc := docs[0]
        var job GenerationJob
        if err := doc.DataTo(&job); err != nil {
            return err
        }

        // Update job status
        job.Status = "claimed"
        job.ClaimedBy = s.instanceID
        claimedAt := now
        job.ClaimedAt = &claimedAt

        if err := tx.Set(doc.Ref, job); err != nil {
            return err
        }

        // Increment user's jobs in flight
        rateLimitRef := s.firestoreClient.Collection("userRateLimits").Doc(job.UserID)
        if err := tx.Update(rateLimitRef, []firestore.Update{
            {Path: "jobsInFlight", Value: firestore.Increment(1)},
        }); err != nil {
            // If rate limit doc doesn't exist, create it
            if err := tx.Set(rateLimitRef, map[string]interface{}{
                "jobsInFlight":     1,
                "maxJobsInFlight":  MaxJobsInFlightPerUser,
                "jobsQueuedToday":  0,
                "maxJobsPerDay":    MaxJobsPerDayPerUser,
                "lastUpdated":      now,
            }, firestore.MergeAll); err != nil {
                return err
            }
        }

        claimedJob = &job
        return nil
    })

    if err == ErrNoJobsAvailable {
        return nil, nil // Not an error, just no work
    }
    if err != nil {
        return nil, err
    }

    logger.Info(appLogger, ctx, "job_claimed",
        slog.String("job_id", claimedJob.ID),
        slog.String("block_id", claimedJob.BlockID),
        slog.String("instance_id", s.instanceID),
    )

    return claimedJob, nil
}

// CompleteJob marks a job as completed and updates metrics
func (s *GenerationQueueService) CompleteJob(
    ctx context.Context,
    job *GenerationJob,
    tokens TokenUsage,
    duration time.Duration,
) error {
    now := time.Now()
    job.Status = "completed"
    job.CompletedAt = &now
    job.ProcessingDuration = duration.Milliseconds()
    job.TokensUsed = tokens

    err := s.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        // Update job
        jobRef := s.firestoreClient.Collection("generationJobs").Doc(job.ID)
        if err := tx.Set(jobRef, job); err != nil {
            return err
        }

        // Decrement user's jobs in flight
        rateLimitRef := s.firestoreClient.Collection("userRateLimits").Doc(job.UserID)
        if err := tx.Update(rateLimitRef, []firestore.Update{
            {Path: "jobsInFlight", Value: firestore.Increment(-1)},
        }); err != nil {
            return err
        }

        // Update user's token usage
        return s.incrementTokenUsage(tx, job.UserID, tokens)
    })

    if err != nil {
        return err
    }

    s.metricsService.RecordJobCompleted(job.Priority, duration.Milliseconds(), tokens)

    logger.Info(appLogger, ctx, "job_completed",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int64("duration_ms", duration.Milliseconds()),
        slog.Int("input_tokens", tokens.Input),
        slog.Int("output_tokens", tokens.Output),
        slog.String("model", tokens.Model),
    )

    return nil
}

// FailJob handles job failure with exponential backoff retry
func (s *GenerationQueueService) FailJob(
    ctx context.Context,
    job *GenerationJob,
    err error,
) error {
    job.Attempts++
    job.LastError = err.Error()

    if job.Attempts >= job.MaxAttempts {
        // Permanent failure
        job.Status = "failed"
        s.metricsService.RecordJobFailed(job.Priority)

        logger.Error(appLogger, ctx, "job_permanently_failed",
            slog.String("job_id", job.ID),
            slog.String("block_id", job.BlockID),
            slog.Int("attempts", job.Attempts),
            slog.String("error", err.Error()),
        )
    } else {
        // Schedule retry with exponential backoff
        // Delays: 2s, 4s, 8s (capped at 30s)
        backoff := time.Duration(1<<uint(job.Attempts)) * time.Second
        if backoff > 30*time.Second {
            backoff = 30 * time.Second
        }

        nextRetry := time.Now().Add(backoff)
        job.Status = "queued"
        job.NextRetryAt = &nextRetry
        job.ScheduledFor = nextRetry
        job.ClaimedBy = ""
        job.ClaimedAt = nil

        logger.Warn(appLogger, ctx, "job_scheduled_retry",
            slog.String("job_id", job.ID),
            slog.String("block_id", job.BlockID),
            slog.Int("attempt", job.Attempts),
            slog.Duration("backoff", backoff),
            slog.String("error", err.Error()),
        )
    }

    return s.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
        jobRef := s.firestoreClient.Collection("generationJobs").Doc(job.ID)
        if err := tx.Set(jobRef, job); err != nil {
            return err
        }

        // Decrement jobs in flight
        rateLimitRef := s.firestoreClient.Collection("userRateLimits").Doc(job.UserID)
        return tx.Update(rateLimitRef, []firestore.Update{
            {Path: "jobsInFlight", Value: firestore.Increment(-1)},
        })
    })
}

// CleanupOrphanedJobs resets jobs stuck in "claimed" state
func (s *GenerationQueueService) CleanupOrphanedJobs(ctx context.Context) (int, error) {
    cutoff := time.Now().Add(-JobClaimTimeout)

    // Find jobs claimed but not processed within timeout
    query := s.firestoreClient.Collection("generationJobs").
        Where("status", "==", "claimed").
        Where("claimedAt", "<", cutoff)

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return 0, err
    }

    resetCount := 0
    for _, doc := range docs {
        var job GenerationJob
        if err := doc.DataTo(&job); err != nil {
            continue
        }

        // Reset job to queued
        job.Status = "queued"
        job.ClaimedBy = ""
        job.ClaimedAt = nil
        job.ScheduledFor = time.Now()

        if _, err := doc.Ref.Set(ctx, job); err != nil {
            logger.Error(appLogger, ctx, "orphan_reset_failed",
                slog.String("job_id", job.ID),
                slog.String("error", err.Error()),
            )
            continue
        }

        logger.Warn(appLogger, ctx, "orphaned_job_reset",
            slog.String("job_id", job.ID),
            slog.String("block_id", job.BlockID),
            slog.String("previous_claimer", job.ClaimedBy),
        )
        resetCount++
    }

    return resetCount, nil
}

// Helper methods

func (s *GenerationQueueService) jobExistsForBlock(ctx context.Context, blockID string) (bool, error) {
    query := s.firestoreClient.Collection("generationJobs").
        Where("blockId", "==", blockID).
        Where("status", "in", []string{"queued", "claimed", "processing"}).
        Limit(1)

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return false, err
    }
    return len(docs) > 0, nil
}

func (s *GenerationQueueService) checkUserRateLimits(ctx context.Context, userID string) error {
    doc, err := s.firestoreClient.Collection("userRateLimits").Doc(userID).Get(ctx)
    if err != nil {
        // No rate limit doc yet - allow
        return nil
    }

    var limits struct {
        JobsInFlight    int `firestore:"jobsInFlight"`
        MaxJobsInFlight int `firestore:"maxJobsInFlight"`
        JobsQueuedToday int `firestore:"jobsQueuedToday"`
        MaxJobsPerDay   int `firestore:"maxJobsPerDay"`
    }
    if err := doc.DataTo(&limits); err != nil {
        return err
    }

    if limits.JobsInFlight >= limits.MaxJobsInFlight {
        return ErrRateLimitExceeded
    }
    if limits.JobsQueuedToday >= limits.MaxJobsPerDay {
        return ErrRateLimitExceeded
    }

    return nil
}

func (s *GenerationQueueService) checkTokenLimit(ctx context.Context, userID string) (bool, error) {
    date := time.Now().UTC().Format("2006-01-02")
    doc, err := s.firestoreClient.Collection("users").Doc(userID).
        Collection("tokenUsage").Doc(date).Get(ctx)

    if err != nil {
        // No usage yet today
        return false, nil
    }

    var usage struct {
        TotalTokens int64 `firestore:"totalTokens"`
    }
    if err := doc.DataTo(&usage); err != nil {
        return false, err
    }

    return usage.TotalTokens >= DailyTokenLimit, nil
}

func (s *GenerationQueueService) incrementTokenUsage(
    tx *firestore.Transaction,
    userID string,
    tokens TokenUsage,
) error {
    date := time.Now().UTC().Format("2006-01-02")
    ref := s.firestoreClient.Collection("users").Doc(userID).
        Collection("tokenUsage").Doc(date)

    return tx.Set(ref, map[string]interface{}{
        "date":         date,
        "inputTokens":  firestore.Increment(int64(tokens.Input)),
        "outputTokens": firestore.Increment(int64(tokens.Output)),
        "totalTokens":  firestore.Increment(int64(tokens.Input + tokens.Output)),
        "limit":        DailyTokenLimit,
        "lastUpdated":  time.Now(),
        fmt.Sprintf("byModel.%s.input", tokens.Model):  firestore.Increment(int64(tokens.Input)),
        fmt.Sprintf("byModel.%s.output", tokens.Model): firestore.Increment(int64(tokens.Output)),
    }, firestore.MergeAll)
}

// GetQueueStats returns current queue statistics
func (s *GenerationQueueService) GetQueueStats(ctx context.Context) (*QueueStats, error) {
    stats := &QueueStats{
        ByPriority: make(map[Priority]int),
    }

    // Count by status
    statuses := []string{"queued", "claimed", "processing"}
    for _, status := range statuses {
        query := s.firestoreClient.Collection("generationJobs").
            Where("status", "==", status)

        docs, err := query.Documents(ctx).GetAll()
        if err != nil {
            return nil, err
        }

        switch status {
        case "queued":
            stats.QueueDepth = int64(len(docs))
        case "claimed":
            stats.ClaimedCount = int64(len(docs))
        case "processing":
            stats.ProcessingCount = int64(len(docs))
        }

        // Count by priority
        for _, doc := range docs {
            var job GenerationJob
            if err := doc.DataTo(&job); err == nil {
                stats.ByPriority[job.Priority]++
            }
        }
    }

    return stats, nil
}

type QueueStats struct {
    QueueDepth      int64
    ClaimedCount    int64
    ProcessingCount int64
    ByPriority      map[Priority]int
}
```

#### 2.2 Background Scheduler (Distributed-Safe)

**File**: `backend/internal/services/background_scheduler.go`

```go
package services

import (
    "context"
    "sync"
    "time"
)

type BackgroundScheduler struct {
    queueService    *GenerationQueueService
    blockGenerator  *BlockGeneratorService
    metricsService  *MetricsService
    firestoreClient *firestore.Client

    // Ticker intervals
    workerTicker      *time.Ticker  // Poll for jobs
    pregenerateTicker *time.Ticker  // Look-ahead generation
    cleanupTicker     *time.Ticker  // Clean orphaned jobs
    metricsTicker     *time.Ticker  // Persist metrics

    // Worker pool
    workerCount int
    stopChan    chan struct{}
    wg          sync.WaitGroup
}

func NewBackgroundScheduler(
    queueService *GenerationQueueService,
    blockGenerator *BlockGeneratorService,
    metricsService *MetricsService,
    firestoreClient *firestore.Client,
    workerCount int,
) *BackgroundScheduler {
    return &BackgroundScheduler{
        queueService:    queueService,
        blockGenerator:  blockGenerator,
        metricsService:  metricsService,
        firestoreClient: firestoreClient,
        workerCount:     workerCount,
        stopChan:        make(chan struct{}),
    }
}

// Start begins all background processes
func (s *BackgroundScheduler) Start(ctx context.Context) {
    logger.Info(appLogger, ctx, "background_scheduler_starting",
        slog.Int("worker_count", s.workerCount),
        slog.String("instance_id", s.queueService.instanceID),
    )

    // Start worker pool - each worker polls Firestore for jobs
    for i := 0; i < s.workerCount; i++ {
        s.wg.Add(1)
        go s.worker(ctx, i)
    }

    // Periodic tasks (all instances run these, Firestore handles coordination)
    s.pregenerateTicker = time.NewTicker(5 * time.Minute)
    s.cleanupTicker = time.NewTicker(2 * time.Minute)
    s.metricsTicker = time.NewTicker(30 * time.Second)

    s.wg.Add(3)
    go s.pregenerateLoop(ctx)
    go s.cleanupLoop(ctx)
    go s.metricsLoop(ctx)

    logger.Info(appLogger, ctx, "background_scheduler_started")
}

// Stop gracefully shuts down
func (s *BackgroundScheduler) Stop() {
    close(s.stopChan)

    if s.pregenerateTicker != nil {
        s.pregenerateTicker.Stop()
    }
    if s.cleanupTicker != nil {
        s.cleanupTicker.Stop()
    }
    if s.metricsTicker != nil {
        s.metricsTicker.Stop()
    }

    s.wg.Wait()
}

// worker continuously polls for and processes jobs
func (s *BackgroundScheduler) worker(ctx context.Context, id int) {
    defer s.wg.Done()

    logger.Info(appLogger, ctx, "worker_started", slog.Int("worker_id", id))

    // Poll interval with jitter to avoid thundering herd
    baseInterval := 200 * time.Millisecond
    jitter := time.Duration(id*50) * time.Millisecond

    ticker := time.NewTicker(baseInterval + jitter)
    defer ticker.Stop()

    for {
        select {
        case <-s.stopChan:
            logger.Info(appLogger, ctx, "worker_stopping", slog.Int("worker_id", id))
            return

        case <-ticker.C:
            // Try to claim a job
            job, err := s.queueService.ClaimNextJob(ctx)
            if err != nil {
                logger.Error(appLogger, ctx, "claim_job_failed",
                    slog.Int("worker_id", id),
                    slog.String("error", err.Error()),
                )
                continue
            }

            if job == nil {
                // No jobs available
                continue
            }

            // Process the job
            s.processJob(ctx, job, id)
        }
    }
}

// processJob handles a single generation job
func (s *BackgroundScheduler) processJob(ctx context.Context, job *GenerationJob, workerID int) {
    startTime := time.Now()

    // Update job status to processing
    job.Status = "processing"
    now := time.Now()
    job.StartedAt = &now

    logger.Info(appLogger, ctx, "job_processing_started",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int("worker_id", workerID),
        slog.Int("attempt", job.Attempts+1),
    )

    // Create timeout context
    jobCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
    defer cancel()

    // Generate block content
    content, tokens, err := s.blockGenerator.GenerateBlockContent(jobCtx, job)
    duration := time.Since(startTime)

    if err != nil {
        s.queueService.FailJob(ctx, job, err)
        return
    }

    // Save content to Firestore
    if err := s.saveBlockContent(ctx, job, content); err != nil {
        s.queueService.FailJob(ctx, job, err)
        return
    }

    // Mark job completed
    if err := s.queueService.CompleteJob(ctx, job, tokens, duration); err != nil {
        logger.Error(appLogger, ctx, "complete_job_failed",
            slog.String("job_id", job.ID),
            slog.String("error", err.Error()),
        )
    }
}

// saveBlockContent updates the block document with generated content
func (s *BackgroundScheduler) saveBlockContent(
    ctx context.Context,
    job *GenerationJob,
    content *BlockContent,
) error {
    blockRef := s.firestoreClient.Collection("courses").Doc(job.CourseID).
        Collection("blocks").Doc(job.BlockID)

    _, err := blockRef.Update(ctx, []firestore.Update{
        {Path: "contentStatus", Value: "ready"},
        {Path: "content", Value: content},
        {Path: "generatedAt", Value: time.Now()},
        {Path: "error", Value: firestore.Delete},
    })

    return err
}

// pregenerateLoop runs block-based look-ahead generation
func (s *BackgroundScheduler) pregenerateLoop(ctx context.Context) {
    defer s.wg.Done()

    for {
        select {
        case <-s.stopChan:
            return
        case <-s.pregenerateTicker.C:
            s.runPregeneration(ctx)
        }
    }
}

// runPregeneration finds active courses and queues look-ahead blocks
func (s *BackgroundScheduler) runPregeneration(ctx context.Context) {
    logger.Info(appLogger, ctx, "pregeneration_started")

    // Get courses accessed in last 24 hours
    cutoff := time.Now().Add(-24 * time.Hour)
    query := s.firestoreClient.CollectionGroup("metadata").
        Where("lastAccessedAt", ">", cutoff).
        Where("status", "==", "active")

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        logger.Error(appLogger, ctx, "pregeneration_query_failed",
            slog.String("error", err.Error()),
        )
        return
    }

    jobsQueued := 0
    for _, doc := range docs {
        var metadata struct {
            ID              string `firestore:"id"`
            UserID          string `firestore:"userId"`
            CurrentPosition struct {
                SectionIndex int `firestore:"sectionIndex"`
                LessonIndex  int `firestore:"lessonIndex"`
                BlockIndex   int `firestore:"blockIndex"`
            } `firestore:"currentPosition"`
        }
        if err := doc.DataTo(&metadata); err != nil {
            continue
        }

        // Get user tier for look-ahead count
        lookAheadBlocks := 5 // Free tier: 5 blocks ahead
        user, err := s.getUserTier(ctx, metadata.UserID)
        if err == nil && user.Tier == "pro" {
            lookAheadBlocks = 15 // Pro tier: 15 blocks ahead
        }

        // Find pending blocks near current position
        queued, err := s.queuePendingBlocksNearPosition(
            ctx,
            metadata.ID,
            metadata.UserID,
            metadata.CurrentPosition,
            lookAheadBlocks,
        )
        if err != nil {
            logger.Error(appLogger, ctx, "pregeneration_queue_failed",
                slog.String("course_id", metadata.ID),
                slog.String("error", err.Error()),
            )
            continue
        }
        jobsQueued += queued
    }

    logger.Info(appLogger, ctx, "pregeneration_completed",
        slog.Int("courses_processed", len(docs)),
        slog.Int("jobs_queued", jobsQueued),
    )
}

// queuePendingBlocksNearPosition queues blocks ahead of user's position
func (s *BackgroundScheduler) queuePendingBlocksNearPosition(
    ctx context.Context,
    courseID string,
    userID string,
    currentPos struct {
        SectionIndex int `firestore:"sectionIndex"`
        LessonIndex  int `firestore:"lessonIndex"`
        BlockIndex   int `firestore:"blockIndex"`
    },
    lookAhead int,
) (int, error) {
    // Get all pending blocks in the course
    query := s.firestoreClient.Collection("courses").Doc(courseID).
        Collection("blocks").
        Where("contentStatus", "==", "pending").
        OrderBy("sectionId", firestore.Asc).
        OrderBy("lessonId", firestore.Asc).
        OrderBy("order", firestore.Asc)

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return 0, err
    }

    queued := 0
    for _, doc := range docs {
        if queued >= lookAhead {
            break
        }

        var block struct {
            ID        string `firestore:"id"`
            SectionID string `firestore:"sectionId"`
            LessonID  string `firestore:"lessonId"`
        }
        if err := doc.DataTo(&block); err != nil {
            continue
        }

        job := &GenerationJob{
            CourseID:  courseID,
            UserID:    userID,
            BlockID:   block.ID,
            SectionID: block.SectionID,
            LessonID:  block.LessonID,
            Priority:  PriorityBackground,
        }

        if err := s.queueService.Enqueue(ctx, job); err != nil {
            if err == ErrTokenLimitExceeded || err == ErrRateLimitExceeded {
                // Stop queueing for this user
                break
            }
            continue
        }
        queued++
    }

    return queued, nil
}

// cleanupLoop handles orphaned jobs
func (s *BackgroundScheduler) cleanupLoop(ctx context.Context) {
    defer s.wg.Done()

    for {
        select {
        case <-s.stopChan:
            return
        case <-s.cleanupTicker.C:
            count, err := s.queueService.CleanupOrphanedJobs(ctx)
            if err != nil {
                logger.Error(appLogger, ctx, "cleanup_failed",
                    slog.String("error", err.Error()),
                )
            } else if count > 0 {
                logger.Info(appLogger, ctx, "cleanup_completed",
                    slog.Int("orphaned_jobs_reset", count),
                )
            }
        }
    }
}

// metricsLoop persists metrics
func (s *BackgroundScheduler) metricsLoop(ctx context.Context) {
    defer s.wg.Done()

    for {
        select {
        case <-s.stopChan:
            return
        case <-s.metricsTicker.C:
            stats, err := s.queueService.GetQueueStats(ctx)
            if err != nil {
                logger.Error(appLogger, ctx, "metrics_fetch_failed",
                    slog.String("error", err.Error()),
                )
                continue
            }
            s.metricsService.PersistRealtimeMetrics(ctx, stats)
        }
    }
}

func (s *BackgroundScheduler) getUserTier(ctx context.Context, userID string) (*UserTier, error) {
    doc, err := s.firestoreClient.Collection("users").Doc(userID).Get(ctx)
    if err != nil {
        return nil, err
    }
    var user UserTier
    err = doc.DataTo(&user)
    return &user, err
}

type UserTier struct {
    Tier string `firestore:"subscriptionTier"`
}
```

#### 2.3 Smart Diff Cache Invalidation

**File**: `backend/internal/services/cache_invalidation.go`

```go
package services

import (
    "context"
    "strings"
)

type ChangeType string

const (
    ChangeTypeTitle       ChangeType = "title"       // No regeneration
    ChangeTypeEmoji       ChangeType = "emoji"       // No regeneration
    ChangeTypeGoal        ChangeType = "goal"        // Regenerate all blocks
    ChangeTypeStructure   ChangeType = "structure"   // Regenerate affected sections
    ChangeTypeSectionEdit ChangeType = "section"     // Regenerate section's blocks only
    ChangeTypeLessonEdit  ChangeType = "lesson"      // Regenerate lesson's blocks only
)

type CacheInvalidationService struct {
    queueService    *GenerationQueueService
    firestoreClient *firestore.Client
}

// InvalidateOnCourseUpdate determines what to regenerate based on change type
func (s *CacheInvalidationService) InvalidateOnCourseUpdate(
    ctx context.Context,
    courseID string,
    userID string,
    changeType ChangeType,
    affectedIDs []string, // sectionIDs or lessonIDs depending on changeType
) error {
    logger.Info(appLogger, ctx, "cache_invalidation_started",
        slog.String("course_id", courseID),
        slog.String("change_type", string(changeType)),
        slog.Int("affected_count", len(affectedIDs)),
    )

    switch changeType {
    case ChangeTypeTitle, ChangeTypeEmoji:
        // No regeneration needed - cosmetic changes only
        logger.Info(appLogger, ctx, "cache_invalidation_skipped",
            slog.String("reason", "cosmetic_change_only"),
        )
        return nil

    case ChangeTypeGoal:
        // Course goal changed - regenerate ALL blocks
        return s.invalidateAllBlocks(ctx, courseID, userID)

    case ChangeTypeStructure:
        // Structure changed (sections added/removed/reordered)
        // Regenerate all blocks in affected sections
        return s.invalidateSectionBlocks(ctx, courseID, userID, affectedIDs)

    case ChangeTypeSectionEdit:
        // Section title/description changed
        // Regenerate only that section's blocks
        return s.invalidateSectionBlocks(ctx, courseID, userID, affectedIDs)

    case ChangeTypeLessonEdit:
        // Lesson title/description changed
        // Regenerate only that lesson's blocks
        return s.invalidateLessonBlocks(ctx, courseID, userID, affectedIDs)
    }

    return nil
}

func (s *CacheInvalidationService) invalidateAllBlocks(
    ctx context.Context,
    courseID string,
    userID string,
) error {
    return s.invalidateBlocksWithQuery(
        ctx,
        courseID,
        userID,
        s.firestoreClient.Collection("courses").Doc(courseID).
            Collection("blocks").
            Where("contentStatus", "==", "ready"),
    )
}

func (s *CacheInvalidationService) invalidateSectionBlocks(
    ctx context.Context,
    courseID string,
    userID string,
    sectionIDs []string,
) error {
    for _, sectionID := range sectionIDs {
        query := s.firestoreClient.Collection("courses").Doc(courseID).
            Collection("blocks").
            Where("sectionId", "==", sectionID).
            Where("contentStatus", "==", "ready")

        if err := s.invalidateBlocksWithQuery(ctx, courseID, userID, query); err != nil {
            return err
        }
    }
    return nil
}

func (s *CacheInvalidationService) invalidateLessonBlocks(
    ctx context.Context,
    courseID string,
    userID string,
    lessonIDs []string,
) error {
    for _, lessonID := range lessonIDs {
        query := s.firestoreClient.Collection("courses").Doc(courseID).
            Collection("blocks").
            Where("lessonId", "==", lessonID).
            Where("contentStatus", "==", "ready")

        if err := s.invalidateBlocksWithQuery(ctx, courseID, userID, query); err != nil {
            return err
        }
    }
    return nil
}

func (s *CacheInvalidationService) invalidateBlocksWithQuery(
    ctx context.Context,
    courseID string,
    userID string,
    query firestore.Query,
) error {
    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return err
    }

    jobsQueued := 0
    for _, doc := range docs {
        var block struct {
            ID        string `firestore:"id"`
            SectionID string `firestore:"sectionId"`
            LessonID  string `firestore:"lessonId"`
            Version   int    `firestore:"version"`
        }
        if err := doc.DataTo(&block); err != nil {
            continue
        }

        // Mark block as pending (invalidate)
        _, err := doc.Ref.Update(ctx, []firestore.Update{
            {Path: "contentStatus", Value: "pending"},
            {Path: "version", Value: block.Version + 1},
            {Path: "content", Value: firestore.Delete},
        })
        if err != nil {
            logger.Error(appLogger, ctx, "block_invalidation_failed",
                slog.String("block_id", block.ID),
                slog.String("error", err.Error()),
            )
            continue
        }

        // Queue for regeneration with lowest priority
        job := &GenerationJob{
            CourseID:  courseID,
            UserID:    userID,
            BlockID:   block.ID,
            SectionID: block.SectionID,
            LessonID:  block.LessonID,
            Priority:  PriorityBackground,
        }

        if err := s.queueService.Enqueue(ctx, job); err != nil {
            if err == ErrTokenLimitExceeded || err == ErrRateLimitExceeded {
                logger.Warn(appLogger, ctx, "regeneration_rate_limited",
                    slog.String("user_id", userID),
                )
                break
            }
            continue
        }
        jobsQueued++
    }

    logger.Info(appLogger, ctx, "cache_invalidation_completed",
        slog.String("course_id", courseID),
        slog.Int("blocks_invalidated", len(docs)),
        slog.Int("jobs_queued", jobsQueued),
    )

    // Increment course version
    metadataRef := s.firestoreClient.Collection("courses").Doc(courseID).
        Collection("metadata").Doc("metadata")
    _, err = metadataRef.Update(ctx, []firestore.Update{
        {Path: "version", Value: firestore.Increment(1)},
    })

    return err
}

// DetectChangeType analyzes old vs new course data to determine change type
func DetectChangeType(oldCourse, newCourse *CourseData) (ChangeType, []string) {
    // Title or emoji only
    if oldCourse.Title != newCourse.Title && oldCourse.Goal == newCourse.Goal {
        return ChangeTypeTitle, nil
    }
    if oldCourse.Emoji != newCourse.Emoji && oldCourse.Goal == newCourse.Goal {
        return ChangeTypeEmoji, nil
    }

    // Goal changed - affects everything
    if oldCourse.Goal != newCourse.Goal {
        return ChangeTypeGoal, nil
    }

    // Check for structure changes
    affectedSections := detectAffectedSections(oldCourse.Outline, newCourse.Outline)
    if len(affectedSections) > 0 {
        return ChangeTypeStructure, affectedSections
    }

    // Check for section content changes
    affectedSectionEdits := detectSectionEdits(oldCourse.Outline, newCourse.Outline)
    if len(affectedSectionEdits) > 0 {
        return ChangeTypeSectionEdit, affectedSectionEdits
    }

    // Check for lesson content changes
    affectedLessonEdits := detectLessonEdits(oldCourse.Outline, newCourse.Outline)
    if len(affectedLessonEdits) > 0 {
        return ChangeTypeLessonEdit, affectedLessonEdits
    }

    // No significant changes
    return ChangeTypeTitle, nil
}

func detectAffectedSections(oldOutline, newOutline *Outline) []string {
    // Compare section IDs, order, count
    var affected []string

    oldSections := make(map[string]int)
    for i, s := range oldOutline.Sections {
        oldSections[s.ID] = i
    }

    for i, s := range newOutline.Sections {
        oldIndex, exists := oldSections[s.ID]
        if !exists {
            // New section added
            affected = append(affected, s.ID)
        } else if oldIndex != i {
            // Section reordered
            affected = append(affected, s.ID)
        }
    }

    // Check for removed sections (blocks orphaned)
    for id := range oldSections {
        found := false
        for _, s := range newOutline.Sections {
            if s.ID == id {
                found = true
                break
            }
        }
        if !found {
            // Section removed - its blocks are orphaned
            affected = append(affected, id)
        }
    }

    return affected
}

func detectSectionEdits(oldOutline, newOutline *Outline) []string {
    var affected []string

    oldSections := make(map[string]*Section)
    for _, s := range oldOutline.Sections {
        oldSections[s.ID] = s
    }

    for _, s := range newOutline.Sections {
        old, exists := oldSections[s.ID]
        if exists && (old.Title != s.Title || old.Description != s.Description) {
            affected = append(affected, s.ID)
        }
    }

    return affected
}

func detectLessonEdits(oldOutline, newOutline *Outline) []string {
    var affected []string

    // Build map of old lessons
    oldLessons := make(map[string]*Lesson)
    for _, s := range oldOutline.Sections {
        for _, l := range s.Lessons {
            oldLessons[l.ID] = l
        }
    }

    // Check each new lesson
    for _, s := range newOutline.Sections {
        for _, l := range s.Lessons {
            old, exists := oldLessons[l.ID]
            if exists && (old.Title != l.Title || old.Description != l.Description) {
                affected = append(affected, l.ID)
            }
        }
    }

    return affected
}
```

---

### 3. Frontend Implementation

#### 3.1 Offline Storage with Server-Wins Sync

**File**: `frontend/src/services/offline/courseStorage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  COURSE_PREFIX: '@ishkul/course_',
  OUTLINE_PREFIX: '@ishkul/outline_',
  BLOCKS_PREFIX: '@ishkul/blocks_',
  SYNC_STATE: '@ishkul/sync_state',
};

interface SyncState {
  courseId: string;
  version: number;           // Course metadata version
  blockVersions: Record<string, number>;
  lastSynced: number;
}

export class CourseOfflineStorage {
  // Save course metadata
  async saveCourseMetadata(courseId: string, metadata: CourseMetadata): Promise<void> {
    const key = `${STORAGE_KEYS.COURSE_PREFIX}${courseId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...metadata,
      _cachedAt: Date.now(),
    }));
  }

  // Save outline
  async saveOutline(courseId: string, outline: CourseOutline): Promise<void> {
    const key = `${STORAGE_KEYS.OUTLINE_PREFIX}${courseId}`;
    await AsyncStorage.setItem(key, JSON.stringify(outline));
  }

  // Save block - only if server version is newer (server wins)
  async saveBlock(
    courseId: string,
    blockId: string,
    block: BlockContent,
    serverVersion: number
  ): Promise<boolean> {
    const syncState = await this.getSyncState(courseId);
    const localVersion = syncState?.blockVersions[blockId] || 0;

    // Server wins - only save if server version is >= local
    if (serverVersion >= localVersion) {
      const key = `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${blockId}`;
      await AsyncStorage.setItem(key, JSON.stringify(block));

      // Update sync state
      await this.updateBlockVersion(courseId, blockId, serverVersion);
      return true;
    }

    return false; // Local was newer (shouldn't happen with server-wins)
  }

  // Get block from cache
  async getBlock(courseId: string, blockId: string): Promise<BlockContent | null> {
    const key = `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${blockId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Check if cache is stale (server version changed)
  async isCacheStale(courseId: string, serverVersion: number): Promise<boolean> {
    const syncState = await this.getSyncState(courseId);
    if (!syncState) return true;
    return serverVersion > syncState.version;
  }

  // Invalidate all blocks for a course (when server version changes)
  async invalidateCourseCache(courseId: string): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key =>
      key.startsWith(`${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_`)
    );
    await AsyncStorage.multiRemove(keysToRemove);

    // Clear sync state for this course
    const allStates = await this.getAllSyncStates();
    delete allStates[courseId];
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(allStates));
  }

  // Sync state management
  async getSyncState(courseId: string): Promise<SyncState | null> {
    const allStates = await this.getAllSyncStates();
    return allStates[courseId] || null;
  }

  async saveSyncState(courseId: string, state: SyncState): Promise<void> {
    const allStates = await this.getAllSyncStates();
    allStates[courseId] = state;
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(allStates));
  }

  private async getAllSyncStates(): Promise<Record<string, SyncState>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE);
    return data ? JSON.parse(data) : {};
  }

  private async updateBlockVersion(
    courseId: string,
    blockId: string,
    version: number
  ): Promise<void> {
    const syncState = await this.getSyncState(courseId) || {
      courseId,
      version: 0,
      blockVersions: {},
      lastSynced: Date.now(),
    };

    syncState.blockVersions[blockId] = version;
    syncState.lastSynced = Date.now();

    await this.saveSyncState(courseId, syncState);
  }
}

export const courseOfflineStorage = new CourseOfflineStorage();
```

#### 3.2 Firestore Sync Service (Server Wins)

**File**: `frontend/src/services/sync/firestoreSync.ts`

```typescript
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { courseOfflineStorage } from '../offline/courseStorage';

export class FirestoreSyncService {
  private unsubscribers: Map<string, Unsubscribe> = new Map();
  private db = getFirestore();

  // Subscribe to course metadata - handles version changes
  subscribeToCourseMetadata(
    courseId: string,
    onUpdate: (metadata: CourseMetadata) => void,
    onVersionChange: (newVersion: number) => void
  ): Unsubscribe {
    const docRef = doc(this.db, 'courses', courseId, 'metadata');

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const metadata = snapshot.data() as CourseMetadata;
      const serverVersion = metadata.version || 0;

      // Check if server version changed (cache invalidation)
      const isStale = await courseOfflineStorage.isCacheStale(courseId, serverVersion);
      if (isStale) {
        // Server wins - invalidate local cache
        await courseOfflineStorage.invalidateCourseCache(courseId);
        onVersionChange(serverVersion);
      }

      // Save to offline storage
      await courseOfflineStorage.saveCourseMetadata(courseId, metadata);

      // Update sync state version
      const syncState = await courseOfflineStorage.getSyncState(courseId);
      await courseOfflineStorage.saveSyncState(courseId, {
        ...syncState,
        courseId,
        version: serverVersion,
        blockVersions: syncState?.blockVersions || {},
        lastSynced: Date.now(),
      });

      onUpdate(metadata);
    });

    this.unsubscribers.set(`metadata_${courseId}`, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to block updates - server always wins
  subscribeToBlock(
    courseId: string,
    blockId: string,
    onUpdate: (block: BlockContent | null, status: string) => void
  ): Unsubscribe {
    const docRef = doc(this.db, 'courses', courseId, 'blocks', blockId);

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null, 'pending');
        return;
      }

      const block = snapshot.data() as BlockContent;
      const serverVersion = block.version || 0;

      // Server wins - always save server data
      if (block.contentStatus === 'ready') {
        await courseOfflineStorage.saveBlock(courseId, blockId, block, serverVersion);
      }

      onUpdate(block, block.contentStatus);
    });

    this.unsubscribers.set(`block_${courseId}_${blockId}`, unsubscribe);
    return unsubscribe;
  }

  // Unsubscribe helpers
  unsubscribe(key: string): void {
    const unsub = this.unsubscribers.get(key);
    if (unsub) {
      unsub();
      this.unsubscribers.delete(key);
    }
  }

  unsubscribeFromCourse(courseId: string): void {
    for (const [key, unsub] of this.unsubscribers) {
      if (key.includes(courseId)) {
        unsub();
        this.unsubscribers.delete(key);
      }
    }
  }

  unsubscribeAll(): void {
    for (const unsub of this.unsubscribers.values()) {
      unsub();
    }
    this.unsubscribers.clear();
  }
}

export const firestoreSyncService = new FirestoreSyncService();
```

---

### 4. API Endpoints

#### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/courses/{id}/metadata` | Fetch metadata only |
| GET | `/api/courses/{id}/outline` | Fetch outline only |
| GET | `/api/courses/{id}/blocks/{blockId}` | Fetch single block |
| POST | `/api/courses/{id}/blocks/{blockId}/generate` | Trigger async generation (returns immediately) |
| GET | `/api/courses/{id}/blocks?ids=a,b,c` | Batch fetch blocks |
| GET | `/api/metrics/realtime` | Current queue stats (for dashboard) |
| GET | `/api/metrics/daily/{date}` | Daily metrics (for dashboard) |
| GET | `/api/users/me/token-usage` | Current user's token usage |
| GET | `/api/users/me/token-usage/{date}` | User's usage for specific date |

---

### 5. Implementation Timeline

| Phase | Days | Focus |
|-------|------|-------|
| **1** | 1-2 | Backend: Queue service, job claiming, rate limiting |
| **2** | 3-4 | Backend: Background scheduler, pregeneration, metrics |
| **3** | 5-6 | Backend: Cache invalidation, API endpoints |
| **4** | 7-8 | Frontend: Offline storage, Firestore sync, block loader |
| **5** | 9-10 | Testing, monitoring, deployment |

---

### 6. Dashboard Metrics

| Metric | Location | Purpose |
|--------|----------|---------|
| Queue Depth | `metrics/realtime.queueDepth` | Current backlog |
| Processing Count | `metrics/realtime.processingCount` | Active workers |
| Throughput/min | `metrics/realtime.throughputPerMinute` | Generation speed |
| Error Rate | `metrics/realtime.errorRate` | System health |
| P95 Latency | `metrics/daily.p95ProcessingTime` | Performance SLA |
| Jobs by Priority | `metrics/daily.byPriority` | Distribution |
| Tokens by Model | `metrics/daily.byModel` | Cost tracking |
| User Token Usage | `users/{id}/tokenUsage/{date}` | Per-user limits |

---

### 7. Logging Events

| Event | Level | Fields |
|-------|-------|--------|
| `job_enqueued` | INFO | job_id, block_id, user_id, priority |
| `job_claimed` | INFO | job_id, block_id, instance_id |
| `job_processing_started` | INFO | job_id, block_id, worker_id, attempt |
| `job_completed` | INFO | job_id, block_id, duration_ms, input_tokens, output_tokens, model |
| `job_scheduled_retry` | WARN | job_id, block_id, attempt, backoff, error |
| `job_permanently_failed` | ERROR | job_id, block_id, attempts, error |
| `token_limit_exceeded` | WARN | user_id |
| `rate_limit_exceeded` | WARN | user_id |
| `orphaned_job_reset` | WARN | job_id, block_id, previous_claimer |
| `pregeneration_started` | INFO | - |
| `pregeneration_completed` | INFO | courses_processed, jobs_queued |
| `cache_invalidation_started` | INFO | course_id, change_type |
| `cache_invalidation_completed` | INFO | course_id, blocks_invalidated, jobs_queued |

---

**Document Version**: 2.0.0
**Last Updated**: 2024-12-13
**Status**: Refined & Ready for Implementation
