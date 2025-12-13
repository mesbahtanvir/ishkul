# PRD: Course Generation Optimization

**Version**: 1.0.0
**Status**: Draft
**Author**: Claude
**Date**: 2024-12-13
**Reviewers**: @mesbahtanvir

---

## Executive Summary

Optimize course content generation to eliminate user-perceived lag by implementing:
1. **Look-ahead pre-generation** with priority queue
2. **In-Go background scheduler** (no external services)
3. **Offline-first architecture** with Firebase sync
4. **Comprehensive metrics** for monitoring dashboards
5. **Token usage tracking** with daily caps (1M tokens/user/day)

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
- Backward compatibility with old data structure (clean migration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 SYSTEM ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                              GO SERVICE                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │   API       │  │ Generation  │  │ Background  │  │   Metrics           │  │   │
│  │  │   Handlers  │──│ Queue       │──│ Scheduler   │──│   Collector         │  │   │
│  │  │             │  │ (Priority)  │  │ (Ticker)    │  │   (Token/Job Stats) │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │         │                │                │                    │              │   │
│  │         └────────────────┴────────────────┴────────────────────┘              │   │
│  │                                     │                                         │   │
│  │                                     ▼                                         │   │
│  │                          ┌─────────────────┐                                  │   │
│  │                          │   LLM Router    │                                  │   │
│  │                          │ (OpenAI/DeepSeek)                                  │   │
│  │                          └─────────────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                              FIRESTORE                                        │   │
│  │                                                                               │   │
│  │   courses/{courseId}/              generationJobs/{jobId}                     │   │
│  │     ├── metadata                     ├── courseId, blockId                    │   │
│  │     ├── outline                      ├── priority (1-4)                       │   │
│  │     └── blocks/ (subcollection)      ├── status, attempts                     │   │
│  │           └── {blockId}              └── createdAt, startedAt                 │   │
│  │                                                                               │   │
│  │   users/{userId}/                  metrics/                                   │   │
│  │     └── tokenUsage/{date}            ├── daily/{date}                         │   │
│  │           ├── inputTokens            │     └── aggregated stats               │   │
│  │           ├── outputTokens           └── jobs/{jobId}                         │   │
│  │           └── byModel: {}                  └── per-job metrics                │   │
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
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. Data Model Changes

#### 1.1 New Firestore Structure

```
courses/{courseId}/
  ├── metadata (document)
  │     ├── id: string
  │     ├── userId: string
  │     ├── title: string
  │     ├── emoji: string
  │     ├── status: "active" | "completed" | "archived" | "deleted"
  │     ├── outlineStatus: "generating" | "ready" | "failed"
  │     ├── progress: number (0-100)
  │     ├── currentPosition: LessonPosition
  │     ├── courseProgress: CourseProgress
  │     ├── totalBlocks: number
  │     ├── readyBlocks: number
  │     ├── createdAt, updatedAt, lastAccessedAt: timestamp
  │     └── outlineVersion: number (for cache invalidation)
  │
  ├── outline (document)
  │     ├── title: string
  │     ├── description: string
  │     ├── estimatedMinutes: number
  │     ├── metadata: { difficulty, category, tags[] }
  │     ├── learningOutcomes: string[]
  │     └── sections: Section[] (structure only, no block content)
  │           ├── id, title, description
  │           ├── status: "pending" | "in_progress" | "completed"
  │           └── lessons: Lesson[]
  │                 ├── id, title, description
  │                 ├── blocksStatus: "pending" | "generating" | "ready"
  │                 └── blockIds: string[] (references to blocks subcollection)
  │
  └── blocks/ (subcollection)
        └── {blockId} (document)
              ├── id: string
              ├── lessonId: string
              ├── sectionId: string
              ├── type: "text" | "code" | "question" | "task" | "flashcard" | "summary"
              ├── title: string
              ├── purpose: string
              ├── order: number
              ├── contentStatus: "pending" | "generating" | "ready" | "error"
              ├── content: BlockContent (when ready)
              ├── generatedAt: timestamp
              ├── generationDuration: number (ms)
              ├── tokensUsed: { input: number, output: number, model: string }
              └── version: number (for cache invalidation)
```

#### 1.2 Generation Queue Collection

```
generationJobs/{jobId}/
  ├── id: string
  ├── courseId: string
  ├── userId: string
  ├── blockId: string
  ├── lessonId: string
  ├── sectionId: string
  ├── priority: number (1=immediate, 2=current-lesson, 3=look-ahead, 4=background)
  ├── status: "queued" | "processing" | "completed" | "failed" | "cancelled"
  ├── attempts: number
  ├── maxAttempts: number (default: 3)
  ├── createdAt: timestamp
  ├── startedAt: timestamp | null
  ├── completedAt: timestamp | null
  ├── error: string | null
  ├── tokensUsed: { input: number, output: number, model: string }
  └── processingDuration: number (ms)
```

#### 1.3 Token Usage Tracking

```
users/{userId}/
  └── tokenUsage/{date}  (format: "2024-12-13")
        ├── date: string
        ├── inputTokens: number
        ├── outputTokens: number
        ├── totalTokens: number
        ├── limit: number (1,000,000)
        ├── limitExceeded: boolean
        ├── byModel: {
        │     "gpt-4o": { input: number, output: number },
        │     "gpt-4o-mini": { input: number, output: number },
        │     "deepseek-chat": { input: number, output: number }
        │   }
        └── lastUpdated: timestamp
```

#### 1.4 Metrics Collection

```
metrics/
  ├── daily/{date}
  │     ├── jobsQueued: number
  │     ├── jobsCompleted: number
  │     ├── jobsFailed: number
  │     ├── avgProcessingTime: number (ms)
  │     ├── p95ProcessingTime: number (ms)
  │     ├── totalInputTokens: number
  │     ├── totalOutputTokens: number
  │     ├── byPriority: {
  │     │     "1": { queued, completed, failed, avgTime },
  │     │     "2": { ... },
  │     │     "3": { ... },
  │     │     "4": { ... }
  │     │   }
  │     ├── byModel: {
  │     │     "gpt-4o": { jobs, inputTokens, outputTokens, avgTime },
  │     │     "gpt-4o-mini": { ... }
  │     │   }
  │     └── hourly: { "00": stats, "01": stats, ... }
  │
  └── realtime (single document, updated frequently)
        ├── queueDepth: number
        ├── processingCount: number
        ├── avgWaitTime: number (ms)
        ├── throughputPerMinute: number
        ├── errorRate: number (percentage)
        └── lastUpdated: timestamp
```

---

### 2. Backend Implementation

#### 2.1 Generation Queue Service

**File**: `backend/internal/services/generation_queue.go`

```go
package services

import (
    "context"
    "sync"
    "sync/atomic"
    "time"
)

type Priority int

const (
    PriorityImmediate   Priority = 1  // User waiting on block
    PriorityCurrentLesson Priority = 2 // Blocks in current lesson
    PriorityLookAhead   Priority = 3  // Next lesson blocks
    PriorityBackground  Priority = 4  // Background pre-generation
)

type GenerationJob struct {
    ID                string
    CourseID          string
    UserID            string
    BlockID           string
    LessonID          string
    SectionID         string
    Priority          Priority
    Status            string
    Attempts          int
    MaxAttempts       int
    CreatedAt         time.Time
    StartedAt         *time.Time
    CompletedAt       *time.Time
    Error             string
    TokensUsed        TokenUsage
    ProcessingDuration int64 // milliseconds
}

type TokenUsage struct {
    Input  int    `json:"input"`
    Output int    `json:"output"`
    Model  string `json:"model"`
}

type GenerationQueueService struct {
    firebaseService *firebase.FirebaseService
    llmRouter       *LLMRouter
    metricsService  *MetricsService

    // In-memory priority queue (sorted by priority + createdAt)
    queue           []*GenerationJob
    queueMutex      sync.RWMutex

    // Deduplication
    inProgress      sync.Map // key: blockId, value: jobId

    // Worker control
    workerCount     int
    stopChan        chan struct{}

    // Metrics
    queueDepth      int64
    processingCount int64
    completedCount  int64
    failedCount     int64
}

func NewGenerationQueueService(
    firebaseService *firebase.FirebaseService,
    llmRouter *LLMRouter,
    metricsService *MetricsService,
    workerCount int,
) *GenerationQueueService {
    return &GenerationQueueService{
        firebaseService: firebaseService,
        llmRouter:       llmRouter,
        metricsService:  metricsService,
        queue:           make([]*GenerationJob, 0),
        workerCount:     workerCount,
        stopChan:        make(chan struct{}),
    }
}

// Enqueue adds a job to the queue with deduplication
func (s *GenerationQueueService) Enqueue(ctx context.Context, job *GenerationJob) error {
    // Check if already in progress
    if _, exists := s.inProgress.Load(job.BlockID); exists {
        logger.Info(appLogger, ctx, "job_already_in_progress",
            slog.String("block_id", job.BlockID),
        )
        return nil
    }

    // Check token limit before queueing
    exceeded, err := s.checkTokenLimit(ctx, job.UserID)
    if err != nil {
        return err
    }
    if exceeded {
        logger.Warn(appLogger, ctx, "token_limit_exceeded",
            slog.String("user_id", job.UserID),
        )
        return ErrTokenLimitExceeded
    }

    // Save to Firestore
    job.ID = uuid.New().String()
    job.Status = "queued"
    job.CreatedAt = time.Now()
    job.MaxAttempts = 3

    if err := s.firebaseService.SaveGenerationJob(ctx, job); err != nil {
        return err
    }

    // Add to in-memory queue
    s.queueMutex.Lock()
    s.insertByPriority(job)
    s.queueMutex.Unlock()

    atomic.AddInt64(&s.queueDepth, 1)
    s.metricsService.RecordJobQueued(job.Priority)

    logger.Info(appLogger, ctx, "job_enqueued",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int("priority", int(job.Priority)),
        slog.Int64("queue_depth", atomic.LoadInt64(&s.queueDepth)),
    )

    return nil
}

// EnqueueBatch adds multiple jobs efficiently
func (s *GenerationQueueService) EnqueueBatch(ctx context.Context, jobs []*GenerationJob) error {
    for _, job := range jobs {
        if err := s.Enqueue(ctx, job); err != nil {
            // Log but continue with other jobs
            logger.Error(appLogger, ctx, "batch_enqueue_failed",
                slog.String("block_id", job.BlockID),
                slog.String("error", err.Error()),
            )
        }
    }
    return nil
}

// insertByPriority maintains queue order by priority (ascending) then createdAt (ascending)
func (s *GenerationQueueService) insertByPriority(job *GenerationJob) {
    // Binary search for insertion point
    i := sort.Search(len(s.queue), func(i int) bool {
        if s.queue[i].Priority == job.Priority {
            return s.queue[i].CreatedAt.After(job.CreatedAt)
        }
        return s.queue[i].Priority > job.Priority
    })

    // Insert at position i
    s.queue = append(s.queue, nil)
    copy(s.queue[i+1:], s.queue[i:])
    s.queue[i] = job
}

// dequeue removes and returns the highest priority job
func (s *GenerationQueueService) dequeue() *GenerationJob {
    s.queueMutex.Lock()
    defer s.queueMutex.Unlock()

    if len(s.queue) == 0 {
        return nil
    }

    job := s.queue[0]
    s.queue = s.queue[1:]
    atomic.AddInt64(&s.queueDepth, -1)

    return job
}

// GetQueueStats returns current queue statistics
func (s *GenerationQueueService) GetQueueStats() QueueStats {
    s.queueMutex.RLock()
    defer s.queueMutex.RUnlock()

    stats := QueueStats{
        QueueDepth:      atomic.LoadInt64(&s.queueDepth),
        ProcessingCount: atomic.LoadInt64(&s.processingCount),
        CompletedCount:  atomic.LoadInt64(&s.completedCount),
        FailedCount:     atomic.LoadInt64(&s.failedCount),
        ByPriority:      make(map[Priority]int),
    }

    for _, job := range s.queue {
        stats.ByPriority[job.Priority]++
    }

    return stats
}
```

#### 2.2 Background Scheduler

**File**: `backend/internal/services/background_scheduler.go`

```go
package services

import (
    "context"
    "time"
)

type BackgroundScheduler struct {
    generationQueue *GenerationQueueService
    firebaseService *firebase.FirebaseService
    metricsService  *MetricsService

    // Ticker intervals
    workerTicker        *time.Ticker  // Process queue
    pregenerateTicker   *time.Ticker  // Look-ahead generation
    cleanupTicker       *time.Ticker  // Clean stale jobs
    metricsTicker       *time.Ticker  // Persist metrics

    // Worker pool
    workerCount     int
    stopChan        chan struct{}
    wg              sync.WaitGroup
}

func NewBackgroundScheduler(
    generationQueue *GenerationQueueService,
    firebaseService *firebase.FirebaseService,
    metricsService *MetricsService,
    workerCount int,
) *BackgroundScheduler {
    return &BackgroundScheduler{
        generationQueue: generationQueue,
        firebaseService: firebaseService,
        metricsService:  metricsService,
        workerCount:     workerCount,
        stopChan:        make(chan struct{}),
    }
}

// Start begins all background processes
func (s *BackgroundScheduler) Start(ctx context.Context) {
    logger.Info(appLogger, ctx, "background_scheduler_starting",
        slog.Int("worker_count", s.workerCount),
    )

    // Start worker pool for queue processing
    for i := 0; i < s.workerCount; i++ {
        s.wg.Add(1)
        go s.worker(ctx, i)
    }

    // Start periodic tasks
    s.workerTicker = time.NewTicker(100 * time.Millisecond)      // Check queue frequently
    s.pregenerateTicker = time.NewTicker(5 * time.Minute)        // Look-ahead every 5 min
    s.cleanupTicker = time.NewTicker(2 * time.Minute)            // Cleanup every 2 min
    s.metricsTicker = time.NewTicker(30 * time.Second)           // Persist metrics every 30s

    // Pregeneration loop
    s.wg.Add(1)
    go s.pregenerateLoop(ctx)

    // Cleanup loop
    s.wg.Add(1)
    go s.cleanupLoop(ctx)

    // Metrics persistence loop
    s.wg.Add(1)
    go s.metricsLoop(ctx)

    logger.Info(appLogger, ctx, "background_scheduler_started")
}

// Stop gracefully shuts down all background processes
func (s *BackgroundScheduler) Stop() {
    close(s.stopChan)

    if s.workerTicker != nil {
        s.workerTicker.Stop()
    }
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

// worker processes jobs from the queue
func (s *BackgroundScheduler) worker(ctx context.Context, id int) {
    defer s.wg.Done()

    logger.Info(appLogger, ctx, "worker_started", slog.Int("worker_id", id))

    for {
        select {
        case <-s.stopChan:
            logger.Info(appLogger, ctx, "worker_stopping", slog.Int("worker_id", id))
            return

        case <-s.workerTicker.C:
            job := s.generationQueue.dequeue()
            if job == nil {
                continue
            }

            s.processJob(ctx, job, id)
        }
    }
}

// processJob handles a single generation job
func (s *BackgroundScheduler) processJob(ctx context.Context, job *GenerationJob, workerID int) {
    startTime := time.Now()

    // Mark as in progress
    s.generationQueue.inProgress.Store(job.BlockID, job.ID)
    defer s.generationQueue.inProgress.Delete(job.BlockID)

    atomic.AddInt64(&s.generationQueue.processingCount, 1)
    defer atomic.AddInt64(&s.generationQueue.processingCount, -1)

    // Update job status
    job.Status = "processing"
    now := time.Now()
    job.StartedAt = &now
    job.Attempts++

    logger.Info(appLogger, ctx, "job_processing_started",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int("worker_id", workerID),
        slog.Int("attempt", job.Attempts),
    )

    // Create timeout context
    jobCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
    defer cancel()

    // Generate content
    content, tokenUsage, err := s.generateBlockContent(jobCtx, job)

    duration := time.Since(startTime).Milliseconds()
    job.ProcessingDuration = duration
    job.TokensUsed = tokenUsage

    if err != nil {
        s.handleJobFailure(ctx, job, err)
        return
    }

    // Save content to Firestore
    if err := s.firebaseService.SaveBlockContent(ctx, job.CourseID, job.BlockID, content); err != nil {
        s.handleJobFailure(ctx, job, err)
        return
    }

    // Update token usage for user
    if err := s.metricsService.RecordTokenUsage(ctx, job.UserID, tokenUsage); err != nil {
        logger.Error(appLogger, ctx, "token_usage_record_failed",
            slog.String("user_id", job.UserID),
            slog.String("error", err.Error()),
        )
    }

    // Mark job completed
    job.Status = "completed"
    completedAt := time.Now()
    job.CompletedAt = &completedAt

    if err := s.firebaseService.UpdateGenerationJob(ctx, job); err != nil {
        logger.Error(appLogger, ctx, "job_update_failed",
            slog.String("job_id", job.ID),
            slog.String("error", err.Error()),
        )
    }

    atomic.AddInt64(&s.generationQueue.completedCount, 1)
    s.metricsService.RecordJobCompleted(job.Priority, duration, tokenUsage)

    logger.Info(appLogger, ctx, "job_completed",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int64("duration_ms", duration),
        slog.Int("input_tokens", tokenUsage.Input),
        slog.Int("output_tokens", tokenUsage.Output),
        slog.String("model", tokenUsage.Model),
    )
}

// handleJobFailure handles failed jobs with retry logic
func (s *BackgroundScheduler) handleJobFailure(ctx context.Context, job *GenerationJob, err error) {
    logger.Error(appLogger, ctx, "job_failed",
        slog.String("job_id", job.ID),
        slog.String("block_id", job.BlockID),
        slog.Int("attempt", job.Attempts),
        slog.String("error", err.Error()),
    )

    if job.Attempts >= job.MaxAttempts {
        job.Status = "failed"
        job.Error = err.Error()
        atomic.AddInt64(&s.generationQueue.failedCount, 1)
        s.metricsService.RecordJobFailed(job.Priority)
    } else {
        // Re-queue with same priority
        job.Status = "queued"
        s.generationQueue.queueMutex.Lock()
        s.generationQueue.insertByPriority(job)
        s.generationQueue.queueMutex.Unlock()
        atomic.AddInt64(&s.generationQueue.queueDepth, 1)
    }

    s.firebaseService.UpdateGenerationJob(ctx, job)
}

// pregenerateLoop runs look-ahead generation for active courses
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
    activeCourses, err := s.firebaseService.GetRecentlyAccessedCourses(ctx, 24*time.Hour)
    if err != nil {
        logger.Error(appLogger, ctx, "pregeneration_fetch_failed",
            slog.String("error", err.Error()),
        )
        return
    }

    jobsQueued := 0
    for _, course := range activeCourses {
        // Get user tier for look-ahead count
        user, err := s.firebaseService.GetUser(ctx, course.UserID)
        if err != nil {
            continue
        }

        lookAhead := 1 // Free tier
        if user.SubscriptionTier == "pro" {
            lookAhead = 3
        }

        // Find pending blocks near current position
        pendingBlocks, err := s.firebaseService.GetPendingBlocksNearPosition(
            ctx, course.ID, course.CurrentPosition, lookAhead,
        )
        if err != nil {
            continue
        }

        for _, block := range pendingBlocks {
            job := &GenerationJob{
                CourseID:  course.ID,
                UserID:    course.UserID,
                BlockID:   block.ID,
                LessonID:  block.LessonID,
                SectionID: block.SectionID,
                Priority:  PriorityBackground,
            }

            if err := s.generationQueue.Enqueue(ctx, job); err != nil {
                if err != ErrTokenLimitExceeded {
                    logger.Error(appLogger, ctx, "pregeneration_enqueue_failed",
                        slog.String("block_id", block.ID),
                        slog.String("error", err.Error()),
                    )
                }
                continue
            }
            jobsQueued++
        }
    }

    logger.Info(appLogger, ctx, "pregeneration_completed",
        slog.Int("courses_processed", len(activeCourses)),
        slog.Int("jobs_queued", jobsQueued),
    )
}

// cleanupLoop handles stale and orphaned jobs
func (s *BackgroundScheduler) cleanupLoop(ctx context.Context) {
    defer s.wg.Done()

    for {
        select {
        case <-s.stopChan:
            return
        case <-s.cleanupTicker.C:
            s.runCleanup(ctx)
        }
    }
}

// runCleanup finds and resets orphaned jobs
func (s *BackgroundScheduler) runCleanup(ctx context.Context) {
    // Find jobs stuck in "processing" for > 2 minutes
    orphanedJobs, err := s.firebaseService.GetOrphanedJobs(ctx, 2*time.Minute)
    if err != nil {
        logger.Error(appLogger, ctx, "cleanup_fetch_failed",
            slog.String("error", err.Error()),
        )
        return
    }

    for _, job := range orphanedJobs {
        logger.Warn(appLogger, ctx, "orphaned_job_found",
            slog.String("job_id", job.ID),
            slog.String("block_id", job.BlockID),
        )

        // Reset and re-queue
        job.Status = "queued"
        job.StartedAt = nil

        s.generationQueue.queueMutex.Lock()
        s.generationQueue.insertByPriority(job)
        s.generationQueue.queueMutex.Unlock()
        atomic.AddInt64(&s.generationQueue.queueDepth, 1)

        s.firebaseService.UpdateGenerationJob(ctx, job)
    }

    if len(orphanedJobs) > 0 {
        logger.Info(appLogger, ctx, "cleanup_completed",
            slog.Int("orphaned_jobs_reset", len(orphanedJobs)),
        )
    }
}

// metricsLoop persists metrics to Firestore
func (s *BackgroundScheduler) metricsLoop(ctx context.Context) {
    defer s.wg.Done()

    for {
        select {
        case <-s.stopChan:
            return
        case <-s.metricsTicker.C:
            stats := s.generationQueue.GetQueueStats()
            s.metricsService.PersistRealtimeMetrics(ctx, stats)
        }
    }
}
```

#### 2.3 Metrics Service

**File**: `backend/internal/services/metrics_service.go`

```go
package services

import (
    "context"
    "sync"
    "sync/atomic"
    "time"
)

type MetricsService struct {
    firebaseService *firebase.FirebaseService

    // In-memory counters (atomic)
    jobsQueued      int64
    jobsCompleted   int64
    jobsFailed      int64
    totalInputTokens  int64
    totalOutputTokens int64

    // Processing time tracking
    processingTimes []int64 // milliseconds
    timesMutex      sync.Mutex

    // By priority
    byPriority map[Priority]*PriorityMetrics
    priorityMutex sync.RWMutex

    // By model
    byModel map[string]*ModelMetrics
    modelMutex sync.RWMutex
}

type PriorityMetrics struct {
    Queued    int64
    Completed int64
    Failed    int64
    TotalTime int64 // milliseconds
}

type ModelMetrics struct {
    Jobs         int64
    InputTokens  int64
    OutputTokens int64
    TotalTime    int64
}

type DailyMetrics struct {
    Date               string                     `json:"date"`
    JobsQueued         int64                      `json:"jobsQueued"`
    JobsCompleted      int64                      `json:"jobsCompleted"`
    JobsFailed         int64                      `json:"jobsFailed"`
    AvgProcessingTime  float64                    `json:"avgProcessingTime"`
    P95ProcessingTime  int64                      `json:"p95ProcessingTime"`
    TotalInputTokens   int64                      `json:"totalInputTokens"`
    TotalOutputTokens  int64                      `json:"totalOutputTokens"`
    ByPriority         map[string]PriorityStats   `json:"byPriority"`
    ByModel            map[string]ModelStats      `json:"byModel"`
    Hourly             map[string]HourlyStats     `json:"hourly"`
}

type RealtimeMetrics struct {
    QueueDepth          int64   `json:"queueDepth"`
    ProcessingCount     int64   `json:"processingCount"`
    AvgWaitTime         float64 `json:"avgWaitTime"`
    ThroughputPerMinute float64 `json:"throughputPerMinute"`
    ErrorRate           float64 `json:"errorRate"`
    LastUpdated         int64   `json:"lastUpdated"`
}

func NewMetricsService(firebaseService *firebase.FirebaseService) *MetricsService {
    return &MetricsService{
        firebaseService: firebaseService,
        byPriority:      make(map[Priority]*PriorityMetrics),
        byModel:         make(map[string]*ModelMetrics),
        processingTimes: make([]int64, 0, 1000),
    }
}

// RecordJobQueued increments queued counter
func (s *MetricsService) RecordJobQueued(priority Priority) {
    atomic.AddInt64(&s.jobsQueued, 1)

    s.priorityMutex.Lock()
    if s.byPriority[priority] == nil {
        s.byPriority[priority] = &PriorityMetrics{}
    }
    atomic.AddInt64(&s.byPriority[priority].Queued, 1)
    s.priorityMutex.Unlock()
}

// RecordJobCompleted records successful completion with timing
func (s *MetricsService) RecordJobCompleted(priority Priority, duration int64, tokens TokenUsage) {
    atomic.AddInt64(&s.jobsCompleted, 1)
    atomic.AddInt64(&s.totalInputTokens, int64(tokens.Input))
    atomic.AddInt64(&s.totalOutputTokens, int64(tokens.Output))

    // Track processing time
    s.timesMutex.Lock()
    s.processingTimes = append(s.processingTimes, duration)
    // Keep only last 1000 for percentile calculation
    if len(s.processingTimes) > 1000 {
        s.processingTimes = s.processingTimes[len(s.processingTimes)-1000:]
    }
    s.timesMutex.Unlock()

    // Priority metrics
    s.priorityMutex.Lock()
    if s.byPriority[priority] == nil {
        s.byPriority[priority] = &PriorityMetrics{}
    }
    atomic.AddInt64(&s.byPriority[priority].Completed, 1)
    atomic.AddInt64(&s.byPriority[priority].TotalTime, duration)
    s.priorityMutex.Unlock()

    // Model metrics
    s.modelMutex.Lock()
    if s.byModel[tokens.Model] == nil {
        s.byModel[tokens.Model] = &ModelMetrics{}
    }
    atomic.AddInt64(&s.byModel[tokens.Model].Jobs, 1)
    atomic.AddInt64(&s.byModel[tokens.Model].InputTokens, int64(tokens.Input))
    atomic.AddInt64(&s.byModel[tokens.Model].OutputTokens, int64(tokens.Output))
    atomic.AddInt64(&s.byModel[tokens.Model].TotalTime, duration)
    s.modelMutex.Unlock()
}

// RecordJobFailed increments failure counter
func (s *MetricsService) RecordJobFailed(priority Priority) {
    atomic.AddInt64(&s.jobsFailed, 1)

    s.priorityMutex.Lock()
    if s.byPriority[priority] == nil {
        s.byPriority[priority] = &PriorityMetrics{}
    }
    atomic.AddInt64(&s.byPriority[priority].Failed, 1)
    s.priorityMutex.Unlock()
}

// RecordTokenUsage updates user's daily token usage
func (s *MetricsService) RecordTokenUsage(ctx context.Context, userID string, tokens TokenUsage) error {
    date := time.Now().Format("2006-01-02")

    return s.firebaseService.IncrementTokenUsage(ctx, userID, date, tokens)
}

// CheckTokenLimit checks if user has exceeded daily limit
func (s *MetricsService) CheckTokenLimit(ctx context.Context, userID string) (bool, error) {
    date := time.Now().Format("2006-01-02")

    usage, err := s.firebaseService.GetTokenUsage(ctx, userID, date)
    if err != nil {
        return false, err
    }

    const dailyLimit = 1_000_000 // 1M tokens
    return usage.TotalTokens >= dailyLimit, nil
}

// GetP95ProcessingTime calculates 95th percentile
func (s *MetricsService) GetP95ProcessingTime() int64 {
    s.timesMutex.Lock()
    defer s.timesMutex.Unlock()

    if len(s.processingTimes) == 0 {
        return 0
    }

    sorted := make([]int64, len(s.processingTimes))
    copy(sorted, s.processingTimes)
    sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })

    index := int(float64(len(sorted)) * 0.95)
    return sorted[index]
}

// PersistRealtimeMetrics saves current metrics to Firestore
func (s *MetricsService) PersistRealtimeMetrics(ctx context.Context, queueStats QueueStats) {
    completed := atomic.LoadInt64(&s.jobsCompleted)
    failed := atomic.LoadInt64(&s.jobsFailed)

    errorRate := float64(0)
    if completed+failed > 0 {
        errorRate = float64(failed) / float64(completed+failed) * 100
    }

    metrics := RealtimeMetrics{
        QueueDepth:          queueStats.QueueDepth,
        ProcessingCount:     queueStats.ProcessingCount,
        ThroughputPerMinute: float64(completed) / float64(time.Since(s.startTime).Minutes()),
        ErrorRate:           errorRate,
        LastUpdated:         time.Now().Unix(),
    }

    if err := s.firebaseService.SaveRealtimeMetrics(ctx, metrics); err != nil {
        logger.Error(appLogger, ctx, "metrics_persist_failed",
            slog.String("error", err.Error()),
        )
    }
}

// PersistDailyMetrics saves daily aggregated metrics
func (s *MetricsService) PersistDailyMetrics(ctx context.Context) {
    date := time.Now().Format("2006-01-02")

    s.priorityMutex.RLock()
    byPriority := make(map[string]PriorityStats)
    for p, m := range s.byPriority {
        avgTime := float64(0)
        if m.Completed > 0 {
            avgTime = float64(m.TotalTime) / float64(m.Completed)
        }
        byPriority[fmt.Sprintf("%d", p)] = PriorityStats{
            Queued:    m.Queued,
            Completed: m.Completed,
            Failed:    m.Failed,
            AvgTime:   avgTime,
        }
    }
    s.priorityMutex.RUnlock()

    s.modelMutex.RLock()
    byModel := make(map[string]ModelStats)
    for model, m := range s.byModel {
        avgTime := float64(0)
        if m.Jobs > 0 {
            avgTime = float64(m.TotalTime) / float64(m.Jobs)
        }
        byModel[model] = ModelStats{
            Jobs:         m.Jobs,
            InputTokens:  m.InputTokens,
            OutputTokens: m.OutputTokens,
            AvgTime:      avgTime,
        }
    }
    s.modelMutex.RUnlock()

    completed := atomic.LoadInt64(&s.jobsCompleted)
    avgTime := float64(0)
    if completed > 0 {
        s.timesMutex.Lock()
        var sum int64
        for _, t := range s.processingTimes {
            sum += t
        }
        avgTime = float64(sum) / float64(len(s.processingTimes))
        s.timesMutex.Unlock()
    }

    daily := DailyMetrics{
        Date:               date,
        JobsQueued:         atomic.LoadInt64(&s.jobsQueued),
        JobsCompleted:      completed,
        JobsFailed:         atomic.LoadInt64(&s.jobsFailed),
        AvgProcessingTime:  avgTime,
        P95ProcessingTime:  s.GetP95ProcessingTime(),
        TotalInputTokens:   atomic.LoadInt64(&s.totalInputTokens),
        TotalOutputTokens:  atomic.LoadInt64(&s.totalOutputTokens),
        ByPriority:         byPriority,
        ByModel:            byModel,
    }

    s.firebaseService.SaveDailyMetrics(ctx, daily)
}
```

#### 2.4 Token Usage Enforcement

**File**: `backend/internal/services/token_limiter.go`

```go
package services

import (
    "context"
    "errors"
    "time"
)

var ErrTokenLimitExceeded = errors.New("daily token limit exceeded")

const (
    DailyTokenLimit = 1_000_000 // 1M tokens per user per day
)

type TokenUsageRecord struct {
    Date          string            `json:"date"`
    InputTokens   int64             `json:"inputTokens"`
    OutputTokens  int64             `json:"outputTokens"`
    TotalTokens   int64             `json:"totalTokens"`
    Limit         int64             `json:"limit"`
    LimitExceeded bool              `json:"limitExceeded"`
    ByModel       map[string]ModelUsage `json:"byModel"`
    LastUpdated   time.Time         `json:"lastUpdated"`
}

type ModelUsage struct {
    Input  int64 `json:"input"`
    Output int64 `json:"output"`
}

// CheckAndRecordUsage atomically checks limit and records usage
func (s *MetricsService) CheckAndRecordUsage(
    ctx context.Context,
    userID string,
    tokens TokenUsage,
) error {
    date := time.Now().Format("2006-01-02")

    // Atomic transaction: read, check, write
    return s.firebaseService.RunTransaction(ctx, func(tx *firestore.Transaction) error {
        usage, err := s.firebaseService.GetTokenUsageInTx(tx, userID, date)
        if err != nil {
            // First usage today - create record
            usage = &TokenUsageRecord{
                Date:        date,
                Limit:       DailyTokenLimit,
                ByModel:     make(map[string]ModelUsage),
            }
        }

        // Check if adding these tokens would exceed limit
        newTotal := usage.TotalTokens + int64(tokens.Input) + int64(tokens.Output)
        if newTotal > DailyTokenLimit {
            usage.LimitExceeded = true
            s.firebaseService.UpdateTokenUsageInTx(tx, userID, date, usage)
            return ErrTokenLimitExceeded
        }

        // Update usage
        usage.InputTokens += int64(tokens.Input)
        usage.OutputTokens += int64(tokens.Output)
        usage.TotalTokens = usage.InputTokens + usage.OutputTokens
        usage.LastUpdated = time.Now()

        // Track by model
        if usage.ByModel == nil {
            usage.ByModel = make(map[string]ModelUsage)
        }
        modelUsage := usage.ByModel[tokens.Model]
        modelUsage.Input += int64(tokens.Input)
        modelUsage.Output += int64(tokens.Output)
        usage.ByModel[tokens.Model] = modelUsage

        return s.firebaseService.UpdateTokenUsageInTx(tx, userID, date, usage)
    })
}
```

#### 2.5 Cache Invalidation Service

**File**: `backend/internal/services/cache_invalidation.go`

```go
package services

import (
    "context"
)

type CacheInvalidationService struct {
    generationQueue *GenerationQueueService
    firebaseService *firebase.FirebaseService
}

// InvalidateCourseBlocks marks all generated blocks for regeneration
func (s *CacheInvalidationService) InvalidateCourseBlocks(
    ctx context.Context,
    courseID string,
    userID string,
) error {
    logger.Info(appLogger, ctx, "cache_invalidation_started",
        slog.String("course_id", courseID),
    )

    // Get all ready blocks
    blocks, err := s.firebaseService.GetBlocksByCourse(ctx, courseID)
    if err != nil {
        return err
    }

    // Queue regeneration with lowest priority
    jobsQueued := 0
    for _, block := range blocks {
        if block.ContentStatus != "ready" {
            continue
        }

        // Mark as pending (invalidate cache)
        block.ContentStatus = "pending"
        block.Version++
        if err := s.firebaseService.UpdateBlockStatus(ctx, courseID, block.ID, block); err != nil {
            logger.Error(appLogger, ctx, "block_invalidation_failed",
                slog.String("block_id", block.ID),
                slog.String("error", err.Error()),
            )
            continue
        }

        // Queue for regeneration with low priority
        job := &GenerationJob{
            CourseID:  courseID,
            UserID:    userID,
            BlockID:   block.ID,
            LessonID:  block.LessonID,
            SectionID: block.SectionId,
            Priority:  PriorityBackground, // Lowest priority
        }

        if err := s.generationQueue.Enqueue(ctx, job); err != nil {
            if err != ErrTokenLimitExceeded {
                logger.Error(appLogger, ctx, "regeneration_enqueue_failed",
                    slog.String("block_id", block.ID),
                    slog.String("error", err.Error()),
                )
            }
            continue
        }
        jobsQueued++
    }

    // Increment course outline version
    if err := s.firebaseService.IncrementOutlineVersion(ctx, courseID); err != nil {
        logger.Error(appLogger, ctx, "outline_version_increment_failed",
            slog.String("course_id", courseID),
            slog.String("error", err.Error()),
        )
    }

    logger.Info(appLogger, ctx, "cache_invalidation_completed",
        slog.String("course_id", courseID),
        slog.Int("blocks_invalidated", len(blocks)),
        slog.Int("jobs_queued", jobsQueued),
    )

    return nil
}
```

---

### 3. Frontend Implementation

#### 3.1 Offline Storage Service

**File**: `frontend/src/services/offline/courseStorage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  COURSE_PREFIX: '@ishkul/course_',
  OUTLINE_PREFIX: '@ishkul/outline_',
  BLOCKS_PREFIX: '@ishkul/blocks_',
  SYNC_STATE: '@ishkul/sync_state',
  OFFLINE_QUEUE: '@ishkul/offline_queue',
};

interface SyncState {
  courseId: string;
  outlineVersion: number;
  blockVersions: Record<string, number>;
  lastSynced: number;
}

interface OfflineQueueItem {
  id: string;
  type: 'progress_update' | 'block_complete';
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

export class CourseOfflineStorage {
  // Save course metadata
  async saveCourseMetadata(courseId: string, metadata: CourseMetadata): Promise<void> {
    const key = `${STORAGE_KEYS.COURSE_PREFIX}${courseId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...metadata,
      cachedAt: Date.now(),
    }));
  }

  // Save course outline
  async saveOutline(courseId: string, outline: CourseOutline): Promise<void> {
    const key = `${STORAGE_KEYS.OUTLINE_PREFIX}${courseId}`;
    await AsyncStorage.setItem(key, JSON.stringify(outline));
  }

  // Save block content
  async saveBlock(courseId: string, blockId: string, block: BlockContent): Promise<void> {
    const key = `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${blockId}`;
    await AsyncStorage.setItem(key, JSON.stringify(block));
  }

  // Save multiple blocks efficiently
  async saveBlocks(courseId: string, blocks: BlockContent[]): Promise<void> {
    const pairs = blocks.map(block => [
      `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${block.id}`,
      JSON.stringify(block),
    ]);
    await AsyncStorage.multiSet(pairs as [string, string][]);
  }

  // Get course metadata
  async getCourseMetadata(courseId: string): Promise<CourseMetadata | null> {
    const key = `${STORAGE_KEYS.COURSE_PREFIX}${courseId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Get outline
  async getOutline(courseId: string): Promise<CourseOutline | null> {
    const key = `${STORAGE_KEYS.OUTLINE_PREFIX}${courseId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Get block content
  async getBlock(courseId: string, blockId: string): Promise<BlockContent | null> {
    const key = `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${blockId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Get multiple blocks
  async getBlocks(courseId: string, blockIds: string[]): Promise<Map<string, BlockContent>> {
    const keys = blockIds.map(id => `${STORAGE_KEYS.BLOCKS_PREFIX}${courseId}_${id}`);
    const results = await AsyncStorage.multiGet(keys);

    const blocks = new Map<string, BlockContent>();
    results.forEach(([key, value]) => {
      if (value) {
        const blockId = key.split('_').pop()!;
        blocks.set(blockId, JSON.parse(value));
      }
    });

    return blocks;
  }

  // Save sync state for a course
  async saveSyncState(courseId: string, state: SyncState): Promise<void> {
    const allStates = await this.getAllSyncStates();
    allStates[courseId] = state;
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(allStates));
  }

  // Get sync state
  async getSyncState(courseId: string): Promise<SyncState | null> {
    const allStates = await this.getAllSyncStates();
    return allStates[courseId] || null;
  }

  private async getAllSyncStates(): Promise<Record<string, SyncState>> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE);
    return data ? JSON.parse(data) : {};
  }

  // Offline queue for pending operations
  async queueOfflineOperation(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.push({
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
    });
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  }

  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  }

  // Clear all offline data for a course
  async clearCourseData(courseId: string): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key =>
      key.includes(courseId)
    );
    await AsyncStorage.multiRemove(keysToRemove);
  }
}

export const courseOfflineStorage = new CourseOfflineStorage();
```

#### 3.2 Firestore Real-Time Sync Service

**File**: `frontend/src/services/sync/firestoreSync.ts`

```typescript
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { courseOfflineStorage } from '../offline/courseStorage';

export class FirestoreSyncService {
  private unsubscribers: Map<string, Unsubscribe> = new Map();
  private db = getFirestore();

  // Subscribe to course metadata changes
  subscribeToCourse(
    courseId: string,
    onUpdate: (metadata: CourseMetadata) => void
  ): Unsubscribe {
    const docRef = doc(this.db, 'courses', courseId, 'metadata');

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const metadata = snapshot.data() as CourseMetadata;

        // Update offline storage
        await courseOfflineStorage.saveCourseMetadata(courseId, metadata);

        // Notify listener
        onUpdate(metadata);
      }
    }, (error) => {
      console.error('Course subscription error:', error);
    });

    this.unsubscribers.set(`course_${courseId}`, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to outline changes
  subscribeToOutline(
    courseId: string,
    onUpdate: (outline: CourseOutline) => void
  ): Unsubscribe {
    const docRef = doc(this.db, 'courses', courseId, 'outline');

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const outline = snapshot.data() as CourseOutline;

        // Check version for cache invalidation
        const syncState = await courseOfflineStorage.getSyncState(courseId);
        if (syncState && outline.version > syncState.outlineVersion) {
          // Outline changed - invalidate block cache
          console.log('Outline version changed, invalidating block cache');
        }

        // Update offline storage
        await courseOfflineStorage.saveOutline(courseId, outline);
        await courseOfflineStorage.saveSyncState(courseId, {
          courseId,
          outlineVersion: outline.version,
          blockVersions: syncState?.blockVersions || {},
          lastSynced: Date.now(),
        });

        onUpdate(outline);
      }
    });

    this.unsubscribers.set(`outline_${courseId}`, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to block changes (for a lesson)
  subscribeToBlocks(
    courseId: string,
    blockIds: string[],
    onBlockUpdate: (blockId: string, block: BlockContent) => void
  ): Unsubscribe {
    const blocksRef = collection(this.db, 'courses', courseId, 'blocks');
    const q = query(blocksRef, where('__name__', 'in', blockIds));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const block = change.doc.data() as BlockContent;

          // Update offline storage
          await courseOfflineStorage.saveBlock(courseId, block.id, block);

          // Notify listener
          onBlockUpdate(block.id, block);
        }
      });
    });

    this.unsubscribers.set(`blocks_${courseId}`, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to single block (for loading state)
  subscribeToBlock(
    courseId: string,
    blockId: string,
    onUpdate: (block: BlockContent | null, status: string) => void
  ): Unsubscribe {
    const docRef = doc(this.db, 'courses', courseId, 'blocks', blockId);

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const block = snapshot.data() as BlockContent;

        if (block.contentStatus === 'ready') {
          await courseOfflineStorage.saveBlock(courseId, blockId, block);
        }

        onUpdate(block, block.contentStatus);
      } else {
        onUpdate(null, 'pending');
      }
    });

    this.unsubscribers.set(`block_${courseId}_${blockId}`, unsubscribe);
    return unsubscribe;
  }

  // Unsubscribe from a specific subscription
  unsubscribe(key: string): void {
    const unsub = this.unsubscribers.get(key);
    if (unsub) {
      unsub();
      this.unsubscribers.delete(key);
    }
  }

  // Unsubscribe from all subscriptions for a course
  unsubscribeFromCourse(courseId: string): void {
    for (const [key, unsub] of this.unsubscribers) {
      if (key.includes(courseId)) {
        unsub();
        this.unsubscribers.delete(key);
      }
    }
  }

  // Unsubscribe from everything
  unsubscribeAll(): void {
    for (const unsub of this.unsubscribers.values()) {
      unsub();
    }
    this.unsubscribers.clear();
  }
}

export const firestoreSyncService = new FirestoreSyncService();
```

#### 3.3 Block Loading Component

**File**: `frontend/src/components/lesson/BlockLoader.tsx`

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { firestoreSyncService } from '../../services/sync/firestoreSync';
import { courseOfflineStorage } from '../../services/offline/courseStorage';
import { useTheme } from '../../hooks/useTheme';

interface BlockLoaderProps {
  courseId: string;
  blockId: string;
  blockType: string;
  blockTitle: string;
  onContentReady: (content: BlockContent) => void;
  onError: (error: string) => void;
}

const LOADING_MESSAGES = [
  "Crafting the perfect explanation for you...",
  "Almost there! Great learning awaits...",
  "Personalizing this content just for you...",
  "Making learning bite-sized and fun...",
  "Preparing something amazing...",
  "Your knowledge boost is loading...",
  "Building your understanding step by step...",
];

export const BlockLoader: React.FC<BlockLoaderProps> = ({
  courseId,
  blockId,
  blockType,
  blockTitle,
  onContentReady,
  onError,
}) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'loading' | 'generating' | 'error'>('loading');
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);
  const [shimmerAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Shimmer animation
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  // Pulse animation for generating state
  useEffect(() => {
    if (status === 'generating') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status]);

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (status === 'generating') {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
        setMessage(LOADING_MESSAGES[randomIndex]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Check offline cache first, then subscribe to Firestore
  useEffect(() => {
    let mounted = true;

    const loadBlock = async () => {
      // Try offline cache first
      const cachedBlock = await courseOfflineStorage.getBlock(courseId, blockId);
      if (cachedBlock && cachedBlock.contentStatus === 'ready') {
        if (mounted) {
          onContentReady(cachedBlock);
        }
        return;
      }

      // Subscribe to Firestore for real-time updates
      const unsubscribe = firestoreSyncService.subscribeToBlock(
        courseId,
        blockId,
        (block, blockStatus) => {
          if (!mounted) return;

          switch (blockStatus) {
            case 'ready':
              if (block) {
                onContentReady(block);
              }
              break;
            case 'generating':
              setStatus('generating');
              break;
            case 'error':
              setStatus('error');
              onError(block?.error || 'Failed to generate content');
              break;
            case 'pending':
              setStatus('loading');
              // Trigger generation via API
              triggerGeneration();
              break;
          }
        }
      );

      return () => {
        mounted = false;
        unsubscribe();
      };
    };

    loadBlock();
  }, [courseId, blockId]);

  const triggerGeneration = useCallback(async () => {
    try {
      // Call API to trigger generation (returns immediately)
      await fetch(`/api/courses/${courseId}/blocks/${blockId}/generate`, {
        method: 'POST',
      });
      setStatus('generating');
    } catch (err) {
      setStatus('error');
      onError('Failed to start content generation');
    }
  }, [courseId, blockId]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.errorBackground }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Something went wrong. Tap to retry.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        status === 'generating' && { transform: [{ scale: pulseAnim }] }
      ]}
    >
      {/* Block title */}
      <Text style={[styles.title, { color: colors.text }]}>{blockTitle}</Text>

      {/* Skeleton lines */}
      <View style={styles.skeletonContainer}>
        {[1, 0.8, 0.9, 0.7].map((width, index) => (
          <Animated.View
            key={index}
            style={[
              styles.skeletonLine,
              {
                width: `${width * 100}%`,
                backgroundColor: colors.border,
              },
              shimmerStyle,
            ]}
          />
        ))}
      </View>

      {/* Loading message */}
      {status === 'generating' && (
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <Text style={[styles.eta, { color: colors.textTertiary }]}>
            Usually takes 2-3 seconds
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  skeletonContainer: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  messageContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
  eta: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
```

#### 3.4 Updated Blocks Store

**File**: `frontend/src/state/blocksStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BlockState {
  // Block content cache
  blocks: Map<string, BlockContent>;

  // Loading states
  loadingBlocks: Set<string>;
  generatingBlocks: Set<string>;
  errorBlocks: Map<string, string>;

  // Offline sync
  pendingSync: string[];
  lastSynced: number;

  // Actions
  setBlock: (courseId: string, blockId: string, block: BlockContent) => void;
  setBlocks: (courseId: string, blocks: BlockContent[]) => void;
  setBlockLoading: (blockId: string, loading: boolean) => void;
  setBlockGenerating: (blockId: string, generating: boolean) => void;
  setBlockError: (blockId: string, error: string | null) => void;
  getBlock: (courseId: string, blockId: string) => BlockContent | undefined;
  clearCourseBlocks: (courseId: string) => void;
  markForSync: (blockId: string) => void;
  clearSyncQueue: () => void;
}

export const useBlocksStore = create<BlockState>()(
  persist(
    (set, get) => ({
      blocks: new Map(),
      loadingBlocks: new Set(),
      generatingBlocks: new Set(),
      errorBlocks: new Map(),
      pendingSync: [],
      lastSynced: 0,

      setBlock: (courseId, blockId, block) => {
        const key = `${courseId}_${blockId}`;
        set((state) => {
          const newBlocks = new Map(state.blocks);
          newBlocks.set(key, block);

          const newLoading = new Set(state.loadingBlocks);
          newLoading.delete(blockId);

          const newGenerating = new Set(state.generatingBlocks);
          newGenerating.delete(blockId);

          const newErrors = new Map(state.errorBlocks);
          newErrors.delete(blockId);

          return {
            blocks: newBlocks,
            loadingBlocks: newLoading,
            generatingBlocks: newGenerating,
            errorBlocks: newErrors,
          };
        });
      },

      setBlocks: (courseId, blocks) => {
        set((state) => {
          const newBlocks = new Map(state.blocks);
          blocks.forEach((block) => {
            newBlocks.set(`${courseId}_${block.id}`, block);
          });
          return { blocks: newBlocks };
        });
      },

      setBlockLoading: (blockId, loading) => {
        set((state) => {
          const newLoading = new Set(state.loadingBlocks);
          if (loading) {
            newLoading.add(blockId);
          } else {
            newLoading.delete(blockId);
          }
          return { loadingBlocks: newLoading };
        });
      },

      setBlockGenerating: (blockId, generating) => {
        set((state) => {
          const newGenerating = new Set(state.generatingBlocks);
          if (generating) {
            newGenerating.add(blockId);
          } else {
            newGenerating.delete(blockId);
          }
          return { generatingBlocks: newGenerating };
        });
      },

      setBlockError: (blockId, error) => {
        set((state) => {
          const newErrors = new Map(state.errorBlocks);
          if (error) {
            newErrors.set(blockId, error);
          } else {
            newErrors.delete(blockId);
          }
          return { errorBlocks: newErrors };
        });
      },

      getBlock: (courseId, blockId) => {
        return get().blocks.get(`${courseId}_${blockId}`);
      },

      clearCourseBlocks: (courseId) => {
        set((state) => {
          const newBlocks = new Map(state.blocks);
          for (const key of newBlocks.keys()) {
            if (key.startsWith(`${courseId}_`)) {
              newBlocks.delete(key);
            }
          }
          return { blocks: newBlocks };
        });
      },

      markForSync: (blockId) => {
        set((state) => ({
          pendingSync: [...state.pendingSync, blockId],
        }));
      },

      clearSyncQueue: () => {
        set({ pendingSync: [], lastSynced: Date.now() });
      },
    }),
    {
      name: 'ishkul-blocks-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        blocks: Array.from(state.blocks.entries()),
        lastSynced: state.lastSynced,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.blocks && Array.isArray(state.blocks)) {
          state.blocks = new Map(state.blocks);
        }
      },
    }
  )
);
```

---

### 4. API Endpoint Changes

#### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/courses/{id}/metadata` | Fetch metadata only |
| GET | `/api/courses/{id}/outline` | Fetch outline only |
| GET | `/api/courses/{id}/blocks/{blockId}` | Fetch single block |
| POST | `/api/courses/{id}/blocks/{blockId}/generate` | Trigger async generation |
| GET | `/api/courses/{id}/blocks/batch?ids=a,b,c` | Batch fetch blocks |
| GET | `/api/metrics/realtime` | Get current queue stats |
| GET | `/api/metrics/daily/{date}` | Get daily metrics |
| GET | `/api/users/{id}/token-usage` | Get user's token usage |

#### Removed Endpoints (No Backward Compatibility)

| Old Path | Replacement |
|----------|-------------|
| GET `/api/courses/{id}` (full) | Split into metadata + outline + blocks |
| POST `/.../generate-blocks` (sync) | POST `/.../generate` (async) |

---

### 5. Migration Plan

#### Phase 1: Data Migration (Day 1-2)

```go
// Migration script: Split existing course documents
func MigrateCourseStructure(ctx context.Context, courseID string) error {
    // 1. Read existing course document
    oldCourse := firebaseService.GetCourse(ctx, courseID)

    // 2. Extract metadata
    metadata := CourseMetadata{
        ID: oldCourse.ID,
        UserID: oldCourse.UserID,
        Title: oldCourse.Title,
        // ... other fields
    }

    // 3. Extract outline (without block content)
    outline := extractOutlineWithoutContent(oldCourse.Outline)

    // 4. Extract blocks to subcollection
    blocks := extractBlocks(oldCourse.Outline)

    // 5. Write new structure
    firebaseService.SaveCourseMetadata(ctx, courseID, metadata)
    firebaseService.SaveOutline(ctx, courseID, outline)
    for _, block := range blocks {
        firebaseService.SaveBlock(ctx, courseID, block.ID, block)
    }

    // 6. Delete old document
    firebaseService.DeleteOldCourse(ctx, courseID)

    return nil
}
```

#### Phase 2: Backend Services (Day 3-5)

1. Implement `GenerationQueueService`
2. Implement `BackgroundScheduler`
3. Implement `MetricsService`
4. Implement `CacheInvalidationService`
5. Update `main.go` to start scheduler

#### Phase 3: Frontend Updates (Day 6-8)

1. Implement `CourseOfflineStorage`
2. Implement `FirestoreSyncService`
3. Update stores to use new data structure
4. Implement `BlockLoader` component
5. Update screens to use new components

#### Phase 4: Testing & Rollout (Day 9-10)

1. Load testing with k6
2. Integration testing
3. Deploy to staging
4. Monitor metrics
5. Deploy to production

---

### 6. Dashboard Metrics Summary

| Metric | Source | Purpose |
|--------|--------|---------|
| Queue Depth | `metrics/realtime.queueDepth` | Current backlog |
| Processing Count | `metrics/realtime.processingCount` | Active workers |
| Throughput/min | `metrics/realtime.throughputPerMinute` | Speed |
| Error Rate | `metrics/realtime.errorRate` | Health |
| Jobs by Priority | `metrics/daily.byPriority` | Distribution |
| Tokens by Model | `metrics/daily.byModel` | Cost tracking |
| P95 Latency | `metrics/daily.p95ProcessingTime` | Performance |
| User Token Usage | `users/{id}/tokenUsage/{date}` | Per-user limits |

---

## Appendix: Logging Schema

All logs use structured JSON format via `slog`:

```json
{
  "time": "2024-12-13T10:00:00Z",
  "level": "INFO",
  "msg": "job_completed",
  "request_id": "abc123",
  "user_id": "user_456",
  "job_id": "job_789",
  "block_id": "block_xyz",
  "duration_ms": 2500,
  "input_tokens": 150,
  "output_tokens": 450,
  "model": "gpt-4o-mini",
  "priority": 2
}
```

Key log events:
- `job_enqueued` - Job added to queue
- `job_processing_started` - Worker picked up job
- `job_completed` - Successful completion
- `job_failed` - Generation failed
- `token_limit_exceeded` - User hit daily cap
- `pregeneration_started` - Background job started
- `cache_invalidation_started` - Course being regenerated

---

**Document Version**: 1.0.0
**Last Updated**: 2024-12-13
